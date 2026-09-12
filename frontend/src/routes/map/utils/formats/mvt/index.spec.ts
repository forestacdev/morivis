import {
	registerLocalMvt,
	releaseLocalMvtEntry,
	requestLocalMvt,
	retainLocalMvtEntry
} from '$routes/map/protocol/vector/local-mvt';
import { VectorTile } from '@mapbox/vector-tile';
import { gzipSync } from 'node:zlib';
import Pbf from 'pbf';
import { afterEach, describe, expect, it, vi } from 'vitest';
import vtpbf from 'vt-pbf';
import { inspectLocalMvt, parseMvtPath } from './index';

const fileAt = (path: string, data: BlobPart) => {
	const file = new File([data], path.split('/').at(-1)!);
	Object.defineProperty(file, 'morivisRelativePath', { value: path });
	return file;
};
const tileBytes = () =>
	vtpbf.fromGeojsonVt(
		{
			'test-layer': {
				features: [{
					type: 3,
					geometry: [[[0, 0], [20, 0], [20, 20], [0, 0]]],
					tags: { 'test-name': 'test-area', 'test-value': 7 }
				}]
			}
		} as unknown as Parameters<typeof vtpbf.fromGeojsonVt>[0]
	);
const tileFile = (path = 'test-set/2/1/1.mvt') => fileAt(path, tileBytes() as BlobPart);
const metadataFile = (extra = {}) =>
	fileAt(
		'test-set/tilejson.json',
		JSON.stringify({
			tilejson: '3.0.0',
			name: 'test-set',
			vector_layers: [{ id: 'test-layer', fields: {} }],
			...extra
		})
	);
const disposers: (() => void)[] = [];
afterEach(() => {
	disposers.splice(0).forEach(dispose => dispose());
	vi.restoreAllMocks();
});
const register = async (files: File[]) => {
	const source = await inspectLocalMvt(files);
	const runtime = registerLocalMvt(source);
	disposers.push(runtime.dispose);
	return { source, ...runtime };
};
const request = (url: string, key = '2/1/1', controller = new AbortController()) =>
	requestLocalMvt({ url: url.replace('{z}/{x}/{y}', key) }, controller);

describe('ローカルMVTフォルダ', () => {
	it('TileJSONとタイルを解析し、形状・属性・実在ズームを取得する', async () => {
		const source = await inspectLocalMvt([
			metadataFile({ bounds: [-20, -10, 20, 10] }),
			tileFile()
		]);
		expect(source.bounds).toEqual([-20, -10, 20, 10]);
		expect([source.minZoom, source.maxZoom, source.tiles.size]).toEqual([2, 2, 1]);
		expect(source.layers).toEqual([{
			id: 'test-layer',
			geometryTypes: ['Polygon'],
			fields: { 'test-name': 'string', 'test-value': 'number' }
		}]);
	});
	it('TileJSONなしでも階層から位置と範囲を取得する', async () => {
		const source = await inspectLocalMvt([tileFile('test-set/0/0/0.pbf')]);
		expect(source.bounds[0]).toBe(-180);
		expect(source.bounds[2]).toBe(180);
		expect(source.layers[0].id).toBe('test-layer');
	});
	it('サンプル以外のタイルを解析時に読まず、表示要求時に読み取る', async () => {
		const later = tileFile('test-set/3/2/2.mvt');
		const read = vi.spyOn(later, 'arrayBuffer');
		const { url } = await register([tileFile(), later]);
		expect(read).not.toHaveBeenCalled();
		const { data } = await request(url, '3/2/2');
		expect(read).toHaveBeenCalledOnce();
		const decoded = new VectorTile(new Pbf(data));
		expect(decoded.layers['test-layer'].feature(0).properties['test-value']).toBe(7);
	});
	it('gzip圧縮タイルを展開して渡す', async () => {
		const { url } = await register([
			fileAt('test-set/2/1/1.mvt.gz', gzipSync(tileBytes()) as BlobPart)
		]);
		expect(new Uint8Array((await request(url)).data)).toEqual(tileBytes());
	});
	it('TMSのyをXYZに直して登録する', async () => {
		const { url } = await register([metadataFile({ scheme: 'tms' }), tileFile()]);
		expect((await request(url, '2/1/2')).data.byteLength).toBeGreaterThan(0);
		expect((await request(url, '2/1/1')).data.byteLength).toBe(0);
	});
	it('欠けている座標は通信せず空タイルを返す', async () => {
		const { url } = await register([tileFile()]);
		const fetch = vi.spyOn(globalThis, 'fetch');
		expect((await request(url, '2/0/0')).data.byteLength).toBe(0);
		expect(fetch).not.toHaveBeenCalled();
	});
	it('コピーが残っている間は保持し、最後の削除で解放する', async () => {
		const { url } = await register([tileFile()]);
		retainLocalMvtEntry('test-original', url);
		retainLocalMvtEntry('test-copy', url);
		releaseLocalMvtEntry('test-original');
		expect((await request(url)).data.byteLength).toBeGreaterThan(0);
		releaseLocalMvtEntry('test-copy');
		await expect(request(url)).rejects.toThrow('もう一度');
	});
	it('キャンセル後の要求を中止する', async () => {
		const { url } = await register([tileFile()]);
		const controller = new AbortController();
		controller.abort();
		await expect(request(url, '2/1/1', controller)).rejects.toThrow();
	});
	it('階層のない単体タイルにフォルダでの再入力を案内する', async () => {
		await expect(inspectLocalMvt([tileFile('1.mvt')])).rejects.toThrow('階層');
	});
	it('メタデータだけ、壊れたタイル、座標の重複を拒否する', async () => {
		await expect(inspectLocalMvt([metadataFile()])).rejects.toThrow('タイルがありません');
		await expect(inspectLocalMvt([fileAt('test-set/2/1/1.mvt', 'invalid')])).rejects.toThrow();
		await expect(inspectLocalMvt([tileFile(), tileFile()])).rejects.toThrow('重複');
	});
	it('不正な座標・パスと異なるフォルダの混在を拒否する', async () => {
		for (const path of ['test-set/1/2/0.mvt', 'test-set/25/0/0.mvt', '../2/1/1.mvt']) {
			expect(parseMvtPath(tileFile(path))).toBeNull();
		}
		await expect(inspectLocalMvt([tileFile(), tileFile('test-other/2/2/1.mvt')])).rejects
			.toThrow('1つずつ');
	});
});
