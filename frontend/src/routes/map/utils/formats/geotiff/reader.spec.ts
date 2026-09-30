import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ZstdCodec } from 'zstd-codec';

import { createTestTiff } from './__fixtures__/test-zstd-tiff';
import { fromArrayBuffer, fromUrl } from './reader';

interface TestCodec {
	Simple: new() => { compress: (bytes: Uint8Array) => Uint8Array; };
	Streaming: new() => { compress: (bytes: Uint8Array) => Uint8Array; };
	Generic: new() => { contentSize: (bytes: Uint8Array) => number | null; };
}

let codec: TestCodec;
beforeAll(async () => {
	codec = await new Promise<TestCodec>(resolve => {
		ZstdCodec.run(value => resolve(value as TestCodec));
	});
});
afterEach(() => vi.unstubAllGlobals());

const int16Bytes = (values: number[]) => {
	const bytes = new Uint8Array(values.length * 2);
	const view = new DataView(bytes.buffer);
	values.forEach((value, index) => view.setInt16(index * 2, value, true));
	return bytes;
};

const readPixels = async (buffer: ArrayBuffer) => {
	const image = await (await fromArrayBuffer(buffer)).getImage();
	const pixels = await image.readRasters({ interleave: true });
	if (Array.isArray(pixels)) throw new Error('Expected interleaved pixels');
	return Array.from(pixels);
};

describe('GeoTIFF共通readerのZSTD対応', () => {
	it('符号付き16bit画素を復元する（同時読込でも初期化を共有する）', async () => {
		const values = [-3, 10, 12, 20];
		const block = new codec.Simple().compress(int16Bytes(values));
		const results = await Promise.all([
			readPixels(createTestTiff(block)),
			readPixels(createTestTiff(block))
		]);
		expect(results).toEqual([values, values]);
	});

	it('展開サイズの記録がないZSTDフレームも復元する', async () => {
		const values = [-3, 10, 12, 20];
		const block = new codec.Streaming().compress(int16Bytes(values));
		expect(new codec.Generic().contentSize(block)).toBeNull();
		expect(await readPixels(createTestTiff(block))).toEqual(values);
	});

	it('Predictor 2の行ごとの差分を復元する', async () => {
		const block = new codec.Simple().compress(int16Bytes([-3, 13, 12, 8]));
		expect(await readPixels(createTestTiff(block, { predictor: 2 })))
			.toEqual([-3, 10, 12, 20]);
	});

	it('Predictor 3の浮動小数点画素を復元する', async () => {
		const values = [1.5, 2.25, -0.5, 4];
		const encoded = new Uint8Array(16);
		for (let row = 0; row < 2; row++) {
			const floats = new DataView(new ArrayBuffer(8));
			floats.setFloat32(0, values[row * 2], false);
			floats.setFloat32(4, values[row * 2 + 1], false);
			const shuffled = new Uint8Array(8);
			for (let byte = 0; byte < 4; byte++) {
				shuffled[byte * 2] = floats.getUint8(byte);
				shuffled[byte * 2 + 1] = floats.getUint8(byte + 4);
			}
			for (let i = 7; i > 0; i--) shuffled[i] -= shuffled[i - 1];
			encoded.set(shuffled, row * 8);
		}
		const block = new codec.Simple().compress(encoded);
		expect(await readPixels(createTestTiff(block, { predictor: 3, bits: 32, sampleFormat: 3 })))
			.toEqual(values);
	});

	it('既存の非圧縮TIFFも読み込める', async () => {
		expect(await readPixels(createTestTiff(int16Bytes([1, 2, 3, 4]), { compression: 1 })))
			.toEqual([1, 2, 3, 4]);
	});

	it('壊れた圧縮ブロックはエラーにする', async () => {
		await expect(readPixels(createTestTiff(new Uint8Array([1, 2, 3, 4]))))
			.rejects.toThrow('ZSTD');
	});

	it('途中で切れたフレームはエラーにする', async () => {
		const block = new codec.Simple().compress(int16Bytes([1, 2, 3, 4]));
		await expect(readPixels(createTestTiff(block.slice(0, -1)))).rejects.toThrow('ZSTD');
	});

	it('URLからRangeリクエストでタイルを取得し、指定窓の画素を復元する', async () => {
		const values = Array.from({ length: 256 }, (_, index) => index - 100);
		const block = new codec.Simple().compress(int16Bytes(values));
		const buffer = createTestTiff(block, { width: 16, height: 16, tiled: true });
		const ranges: string[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (_url: string, options: RequestInit) => {
				const range = new Headers(options.headers).get('Range')!;
				ranges.push(range);
				const match = /^bytes=(\d+)-(\d+)$/.exec(range)!;
				const start = Number(match[1]);
				const end = Math.min(Number(match[2]), buffer.byteLength - 1);
				return new Response(buffer.slice(start, end + 1), {
					status: 206,
					headers: { 'Content-Range': `bytes ${start}-${end}/${buffer.byteLength}` }
				});
			})
		);
		const tiff = await fromUrl('https://test-cog.invalid/test-zstd.tif', {
			blockSize: 2048,
			allowFullFile: false
		});
		try {
			const image = await tiff.getImage();
			const pixels = await image.readRasters({ window: [1, 1, 3, 3], interleave: true });
			if (Array.isArray(pixels)) throw new Error('Expected interleaved pixels');
			expect(Array.from(pixels)).toEqual([-83, -82, -67, -66]);
			expect(ranges.length).toBeGreaterThan(1);
		} finally {
			await tiff.close();
		}
	});
});
