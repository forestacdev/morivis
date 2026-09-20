import { describe, expect, it } from 'vitest';
import { compressTestBlock } from './__fixtures__/binary-world';
import { decodeLz4Block, decompressRobloxChunk } from './compression';

describe('RBXLチャンクの圧縮', () => {
	it('LZ4の重複する後方参照と長い一致列を復元する', async () => {
		const data = new Uint8Array(4096).fill(17);
		data.set([4, 8, 12], 2048);
		const compressed = await compressTestBlock(data, 'lz4');
		expect(compressed.length).toBeLessThan(data.length / 2);
		expect(decodeLz4Block(compressed, data.length)).toEqual(data);
	});
	it.each([{ bytes: [0xf0] }, { bytes: [0x10, 1, 0, 0] }, { bytes: [0x10, 1, 9, 0] }])(
		'不正なLZ4ブロックを拒否する',
		({ bytes }) => {
			expect(() => decodeLz4Block(new Uint8Array(bytes), 10)).toThrow();
		}
	);
	it.each(['lz4', 'zstd', 'zstd-stream'] as const)(
		'%sの展開サイズ不一致を拒否する',
		async compression => {
			const bytes = await compressTestBlock(new Uint8Array(100).fill(7), compression);
			await expect(decompressRobloxChunk(bytes, 50)).rejects.toThrow();
		}
	);
});
