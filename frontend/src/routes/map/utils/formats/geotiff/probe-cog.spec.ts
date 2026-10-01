import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTestCog } from './__fixtures__/test-cog';
import { probeCogUrl } from './probe-cog';

vi.mock('$routes/map/utils/platform/request', () => ({ resolveCogProxyUrl: (url: string) => url }));
afterEach(() => vi.unstubAllGlobals());

const serveRanges = (buffer: ArrayBuffer) => {
	const ranges: [number, number][] = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (_url: string, init: RequestInit) => {
			const range = /^bytes=(\d+)-(\d+)$/.exec(new Headers(init.headers).get('range')!)!;
			const start = Number(range[1]), end = Math.min(Number(range[2]), buffer.byteLength - 1);
			ranges.push([start, end]);
			return new Response(buffer.slice(start, end + 1), {
				status: 206,
				headers: { 'Content-Range': `bytes ${start}-${end}/${buffer.byteLength}` }
			});
		})
	);
	return ranges;
};
const url = 'https://test-cog.invalid/test-cog.tif';

describe('COG URLのメタ情報判定', () => {
	it.each([{ big: false, little: true }, { big: true, little: true }, {
		big: false,
		little: false
	}, { big: true, little: false }])(
		'画素を取得せずTIFF/BigTIFFの構造を判定する: %j',
		async (options) => {
			const { buffer, pixelOffset } = createTestCog(options);
			const ranges = serveRanges(buffer);
			expect(await probeCogUrl(url)).toBe('cog');
			expect(ranges).toEqual([[0, 65535]]);
			expect(ranges.every(([, end]) => end < pixelOffset)).toBe(true);
		}
	);

	it.each([{ tiled: false }, { georeferenced: false }, { overview: false }])(
		'通常TIFFへ振り分ける: %j',
		async (options) => {
			serveRanges(createTestCog(options).buffer);
			expect(await probeCogUrl(url)).toBe('geotiff');
		}
	);

	it('小さいタイルTIFFは縮小画像がなくてもCOG登録できる', async () => {
		serveRanges(createTestCog({ small: true, overview: false }).buffer);
		expect(await probeCogUrl(url)).toBe('cog');
	});

	it('後続ブロックにある縮小画像のIFDもRangeで取得する', async () => {
		const { buffer, pixelOffset } = createTestCog();
		const view = new DataView(buffer);
		new Uint8Array(buffer).copyWithin(65536, 512, 1024);
		view.setUint32(10 + view.getUint16(8, true) * 12, 65536, true);
		const ranges = serveRanges(buffer);
		expect(await probeCogUrl(url)).toBe('cog');
		expect(ranges).toEqual([[0, 65535], [65536, 131071]]);
		expect(ranges.every(([, end]) => end < pixelOffset)).toBe(true);
	});

	it('Rangeを無視した200応答を読み切らずキャンセルする', async () => {
		const response = new Response('test-full-response');
		const cancel = vi.spyOn(response.body!, 'cancel');
		vi.stubGlobal('fetch', vi.fn(async () => response));
		expect(await probeCogUrl(url)).toBe('geotiff');
		expect(cancel).toHaveBeenCalledOnce();
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('HTTPエラーを通常TIFFと誤判定しない', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
		await expect(probeCogUrl(url)).rejects.toThrow('HTTP 503');
	});

	it('Content-Rangeを参照できない場合は判定を中止する', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('test', { status: 206 })));
		await expect(probeCogUrl(url)).rejects.toThrow('Content-Range');
	});

	it('応答本文が指定Rangeより大きい場合は中止する', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				new Response(new Uint8Array(65537), {
					status: 206,
					headers: { 'Content-Range': 'bytes 0-65535/200000' }
				})
			)
		);
		await expect(probeCogUrl(url)).rejects.toThrow('サイズ');
	});

	it('巨大なIFD配列を取得・確保しない', async () => {
		const { buffer } = createTestCog();
		const view = new DataView(buffer);
		for (let i = 0; i < view.getUint16(8, true); i++) {
			const offset = 10 + i * 12;
			if (view.getUint16(offset, true) === 324) view.setUint32(offset + 4, 2_000_000, true);
		}
		const ranges = serveRanges(buffer);
		await expect(probeCogUrl(url)).rejects.toThrow('メタ情報サイズ');
		expect(ranges).toHaveLength(1);
	});
});
