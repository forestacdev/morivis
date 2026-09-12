import { Tile3DLayer } from '@deck.gl/geo-layers';
import { load, type Loader } from '@loaders.gl/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTileset3DBbox } from '../../tiles3d/bounds';
import {
	fetchLocalTilesetResource,
	registerLocalTileset,
	releaseLocalTilesetEntry,
	retainLocalTilesetEntry
} from '../../tiles3d/local-files';
import { findLocalTilesetFiles, getLocalFilePath } from './index';

const fileAt = (path: string, data: string | Uint8Array): File => {
	const file = new File([data as BlobPart], path.split('/').at(-1)!);
	Object.defineProperty(file, 'morivisRelativePath', { value: path });
	return file;
};
const tileset = (uri: string) => ({
	asset: { version: '1.0' },
	geometricError: 10,
	root: {
		boundingVolume: { region: [0, 0, 0.01, 0.01, 0, 5] },
		geometricError: 0,
		content: { uri }
	}
});
const cleanups: (() => void)[] = [];
afterEach(() => {
	cleanups.splice(0).forEach(dispose => dispose());
	vi.restoreAllMocks();
});

describe('local 3D Tiles', () => {
	it('コピーしたレイヤーが残る間は保持し、最後の削除で解放する', async () => {
		const root = fileAt('tileset.json', JSON.stringify(tileset('test.b3dm')));
		const tile = fileAt('test.b3dm', 'test');
		const source = await registerLocalTileset([root, tile], root);
		cleanups.push(source.dispose);
		retainLocalTilesetEntry('test-original', source.url);
		retainLocalTilesetEntry('test-copy', source.url);
		releaseLocalTilesetEntry('test-original');
		expect((await fetchLocalTilesetResource(source.url)).ok).toBe(true);
		releaseLocalTilesetEntry('test-copy');
		await expect(fetchLocalTilesetResource(source.url)).rejects.toThrow(
			'参照ファイルがありません'
		);
	});
	it('タイルセットを内容で判定し、最上位の索引を優先する', async () => {
		const root = fileAt('test-set/tileset.json', JSON.stringify(tileset('child/tiles.json')));
		const child = fileAt('test-set/child/tiles.json', JSON.stringify(tileset('test.b3dm')));
		const geojson = fileAt('test-set/test.json', '{"type":"FeatureCollection","features":[]}');
		expect(await findLocalTilesetFiles([child, geojson, root])).toEqual([root, child]);
	});

	it('同名タイルを別ディレクトリで区別し、日本語・空白・クエリ付きの参照を解決する', async () => {
		const root = fileAt(
			'test-set/tileset.json',
			JSON.stringify(tileset('a/%E8%A9%A6%E9%A8%93%20tile.b3dm?v=1'))
		);
		const a = fileAt('test-set/a/試験 tile.b3dm', 'test-a');
		const b = fileAt('test-set/b/試験 tile.b3dm', 'test-b');
		const source = await registerLocalTileset([root, a, b], root);
		cleanups.push(source.dispose);
		const aUrl = new URL('a/%E8%A9%A6%E9%A8%93%20tile.b3dm?v=1', source.url).href;
		const response = await fetchLocalTilesetResource(aUrl);
		expect(response.url).toBe(aUrl);
		expect(await response.text()).toBe('test-a');
		expect(
			await (await fetchLocalTilesetResource(new URL('b/試験 tile.b3dm', source.url).href))
				.text()
		).toBe('test-b');
	});

	it('登録時にバイナリを読まず、loaders.glの相対パス解決へ接続できる', async () => {
		const root = fileAt('test-set/tileset.json', JSON.stringify(tileset('data/test.b3dm')));
		const tile = fileAt('test-set/data/test.b3dm', 'test-payload');
		const read = vi.spyOn(tile, 'arrayBuffer');
		const text = vi.spyOn(tile, 'text');
		const source = await registerLocalTileset([root, tile], root);
		cleanups.push(source.dispose);
		expect(read).not.toHaveBeenCalled();
		expect(text).not.toHaveBeenCalled();
		const loader = Tile3DLayer.defaultProps.loader as Loader;
		const loaded = await load(source.url, loader, { fetch: fetchLocalTilesetResource }) as {
			root: { contentUrl: string; };
		};
		expect(loaded.root.contentUrl).toBe(new URL('data/test.b3dm', source.url).href);
		expect(getTileset3DBbox(source.tileset).bbox).not.toBeNull();
	});

	it('子タイルセットの../参照とcontents配列を解決する', async () => {
		const root = fileAt('test-set/tileset.json', JSON.stringify(tileset('child/test.json')));
		const child = fileAt(
			'test-set/child/test.json',
			JSON.stringify({
				asset: { version: '1.1' },
				root: { contents: [{ uri: '../data/test.glb' }] }
			})
		);
		const tile = fileAt('test-set/data/test.glb', 'test-glb');
		const source = await registerLocalTileset([root, child, tile], root);
		cleanups.push(source.dispose);
		expect(
			await (await fetchLocalTilesetResource(
				new URL('../data/test.glb', new URL('child/test.json', source.url)).href
			)).text()
		).toBe('test-glb');
	});

	it('索引だけのドロップは不足ファイルを伝える', async () => {
		const root = fileAt('tileset.json', JSON.stringify(tileset('data/test.b3dm')));
		await expect(registerLocalTileset([root], root)).rejects.toThrow('フォルダ全体をドロップ');
	});

	it('解放したフォルダのタイルを通信で取りに行かない', async () => {
		const root = fileAt('tiles.json', JSON.stringify(tileset('test.b3dm')));
		const tile = fileAt('test.b3dm', 'test');
		const source = await registerLocalTileset([root, tile], root);
		source.dispose();
		const network = vi.spyOn(globalThis, 'fetch');
		await expect(fetchLocalTilesetResource(source.url)).rejects.toThrow(
			'参照ファイルがありません'
		);
		expect(network).not.toHaveBeenCalled();
	});

	it('同じ相対パスの別ファイルを黙って上書きしない', async () => {
		const root = fileAt('tiles.json', JSON.stringify(tileset('test.b3dm')));
		await expect(
			registerLocalTileset([root, fileAt('test.b3dm', 'a'), fileAt('test.b3dm', 'b')], root)
		).rejects.toThrow('同じパス');
	});

	it('フォルダ選択inputの相対パスも保持する', () => {
		const file = new File(['test'], 'test.b3dm');
		Object.defineProperty(file, 'webkitRelativePath', { value: 'test-set/data/test.b3dm' });
		expect(getLocalFilePath(file)).toBe('test-set/data/test.b3dm');
	});
});
