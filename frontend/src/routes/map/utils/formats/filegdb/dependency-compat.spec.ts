import JSZip from 'jszip';
import { createRequire } from 'node:module';
import proj4 from 'proj4';
import { describe, expect, it } from 'vitest';
import { createTestFileGdb } from './__fixtures__/test-tables';
import { parseFileGdbInputs } from './index';

const fromZip = createRequire(import.meta.url)('fgdb/lib/fromZip') as (
	data: Uint8Array
) => Promise<Record<string, unknown>>;

describe('FileGDBの依存更新', () => {
	it.each(['buffer', 'view'] as const)('%sから投影座標を持つテーブルを読む', type => {
		const inputs = [...createTestFileGdb()].map(([name, data]) => {
			// byteOffsetが0でない入力も、余白をテーブルとして読まないこと。
			const padded = new Uint8Array(data.length + 12);
			padded.set(data, 4);
			return {
				name: `test-data.gdb/${name}`,
				data: type === 'buffer' ? data.buffer : padded.subarray(4, 4 + data.length)
			};
		});
		const result = parseFileGdbInputs(inputs);
		expect(result.layers).toHaveLength(1);
		expect(result.layers[0].geojson.features[0]).toMatchObject({
			properties: { Name: 'test-point' },
			geometry: { type: 'Point', coordinates: proj4('EPSG:3857', 'EPSG:4326', [1250, 2500]) }
		});
	});

	it('現行JSZipで展開し、カタログからレイヤー名を復元する', async () => {
		const zip = new JSZip();
		for (const [name, data] of createTestFileGdb()) zip.file(`test-data.gdb/${name}`, data);
		const result = await fromZip(await zip.generateAsync({ type: 'uint8array' }));
		expect(result).toMatchObject({
			'test-points': {
				type: 'FeatureCollection',
				features: [{ properties: { Name: 'test-point' }, geometry: { type: 'Point' } }]
			}
		});
	});

	it('不正なZIPと不足テーブルを拒否し、処理を待ち続けない', async () => {
		await expect(fromZip(new Uint8Array([1, 2, 3]))).rejects.toThrow();
		const zip = new JSZip();
		await expect(fromZip(await zip.generateAsync({ type: 'uint8array' })))
			.rejects.toThrow('Missing FileGDB');
	});
});
