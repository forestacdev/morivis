import { createVectorTileEntry } from '$routes/map/data/entries/vector';
import {
	registerLocalMvt,
	releaseLocalMvtEntry,
	requestLocalMvt,
	retainLocalMvtEntry
} from '$routes/map/protocol/vector/local-mvt';
import { createVectorTileSource } from '$routes/map/utils/sources/vector-tiles';
import { decodeTile } from '@maplibre/mlt';
import { gzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import { createPointTile } from './__fixtures__/point';
import { inspectLocalMlt, parseMltPath } from './index';

vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));

const fileAt = (path: string, bytes: BlobPart = createPointTile()) => {
	const file = new File([bytes], path.split('/').at(-1)!);
	Object.defineProperty(file, 'morivisRelativePath', { value: path });
	return file;
};

describe('ローカルMLT', () => {
	it('形状と属性を読み、MLTエントリからMapLibreのencodingまで渡す', async () => {
		const source = await inspectLocalMlt([fileAt('test-set/2/1/1.mlt')]);
		expect(source.layers).toEqual([{
			id: 'test-layer',
			fields: { 'test-value': 'number' },
			geometryTypes: ['Point']
		}]);
		expect([source.minZoom, source.maxZoom, source.tiles.size]).toEqual([2, 2, 1]);
		const runtime = registerLocalMvt(source);
		try {
			const entry = createVectorTileEntry(
				'test-set',
				runtime.url,
				source.layers[0].id,
				'Point',
				'#ffffff',
				{
					format: 'mlt',
					bounds: source.bounds,
					minZoom: source.minZoom,
					maxZoom: source.maxZoom
				}
			);
			if (!entry) throw new Error('test entry required');
			expect(entry.format.type).toBe('mlt');
			expect(createVectorTileSource(entry)).toMatchObject({
				type: 'vector',
				encoding: 'mlt',
				tiles: [runtime.url]
			});
		} finally {
			runtime.dispose();
		}
	});

	it('未選択タイルは後から展開し、コピーの保持・欠けた座標にも対応する', async () => {
		const later = fileAt('test-set/3/2/2.mlt.gz', gzipSync(createPointTile()));
		const read = vi.spyOn(later, 'arrayBuffer');
		const runtime = registerLocalMvt(
			await inspectLocalMlt([fileAt('test-set/2/1/1.mlt'), later])
		);
		try {
			expect(read).not.toHaveBeenCalled();
			retainLocalMvtEntry('test-original', runtime.url);
			retainLocalMvtEntry('test-copy', runtime.url);
			releaseLocalMvtEntry('test-original');
			const request = (key: string) =>
				requestLocalMvt(
					{ url: runtime.url.replace('{z}/{x}/{y}', key) },
					new AbortController()
				);
			const response = await request('3/2/2');
			expect(read).toHaveBeenCalledOnce();
			expect(
				decodeTile(new Uint8Array(response.data))[0].getFeatures()[0]
					.properties['test-value']
			).toBe(7);
			expect(decodeTile(new Uint8Array((await request('2/0/0')).data))).toEqual([]);
			releaseLocalMvtEntry('test-copy');
			await expect(request('3/2/2')).rejects.toThrow('もう一度');
		} finally {
			runtime.dispose();
			read.mockRestore();
		}
	});

	it('TMSをXYZに変換し、圧縮タイルのメタデータを読める', async () => {
		const source = await inspectLocalMlt([
			fileAt('test-set/tilejson.json', JSON.stringify({ scheme: 'tms' })),
			fileAt('test-set/2/1/1.mlt.gz', gzipSync(createPointTile()))
		]);
		expect(source.tiles.has('2/1/2')).toBe(true);
		expect(source.layers[0].geometryTypes).toEqual(['Point']);
	});

	it('位置が不明な単体タイル・不正なデータ・重複を拒否する', async () => {
		expect(parseMltPath(fileAt('../2/1/1.mlt'))).toBeNull();
		await expect(inspectLocalMlt([fileAt('test.mlt')])).rejects.toThrow('階層');
		await expect(inspectLocalMlt([fileAt('test-set/2/1/1.mlt', 'invalid')])).rejects.toThrow(
			'MLTタイル'
		);
		await expect(inspectLocalMlt([fileAt('test-set/2/1/1.mlt'), fileAt('test-set/2/1/1.mlt')]))
			.rejects.toThrow('重複');
	});
});
