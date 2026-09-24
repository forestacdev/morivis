import { I3DMLoader } from '3d-tiles-renderer/three';
import { LoadingManager, Mesh } from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMetadataGlb } from './__fixtures__/tiles';
import { createTilesGltfLoader, prepareGltfResources } from './gltf-loader';
import { registerLocalTileset } from './local-files';
import { embedExternalTileModels } from './renderer-fetch';

afterEach(() => vi.unstubAllGlobals());

const createExternalInstanceTile = () => {
	const json = JSON.stringify({ INSTANCES_LENGTH: 1, POSITION: { byteOffset: 0 } });
	const padded = new TextEncoder().encode(json.padEnd(Math.ceil(json.length / 8) * 8, ' '));
	const uri = new TextEncoder().encode('models/test.glb');
	const bytes = new Uint8Array(32 + padded.length + 16 + uri.length);
	const view = new DataView(bytes.buffer);
	[0x6d643369, 1, bytes.length, padded.length, 16, 0, 0, 0].forEach((value, index) =>
		view.setUint32(index * 4, value, true)
	);
	bytes.set(padded, 32);
	bytes.set(uri, 32 + padded.length + 16);
	return bytes;
};

describe('外部glTFを参照するi3dm', () => {
	it('既存のfetch経路でglTFを取り込み、実ローダーでインスタンスを描画できる形にする', async () => {
		const fetch = vi.fn(async () => new Response(createMetadataGlb().buffer));
		vi.stubGlobal('fetch', fetch);
		const bytes = await embedExternalTileModels(
			createExternalInstanceTile(),
			'https://example.invalid/tiles/test.i3dm'
		);
		expect(fetch).toHaveBeenCalledWith(
			'https://example.invalid/tiles/models/test.glb',
			undefined
		);
		expect(new DataView(bytes.buffer).getUint32(28, true)).toBe(1);
		const manager = new LoadingManager();
		manager.addHandler(
			/\.(gltf|glb)$/i,
			createTilesGltfLoader(
				manager,
				new DRACOLoader(),
				new KTX2Loader(),
				new AbortController().signal
			)
		);
		const loader = new I3DMLoader(manager);
		loader.workingPath = 'https://example.invalid/tiles/';
		const result = await loader.parse(bytes.buffer as ArrayBuffer);
		let count = 0;
		result.scene.traverse(object => {
			if (object instanceof Mesh) count++;
		});
		expect(count).toBe(1);
		expect(fetch).toHaveBeenCalledTimes(1);
	});
	it('cmpt内の外部参照も解決し、内包タイル長を更新する', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response(createMetadataGlb().buffer)));
		const tile = createExternalInstanceTile();
		const bytes = new Uint8Array(16 + tile.length);
		const header = new DataView(bytes.buffer);
		[0x74706d63, 1, bytes.length, 1].forEach((value, index) =>
			header.setUint32(index * 4, value, true)
		);
		bytes.set(tile, 16);
		const result = await embedExternalTileModels(bytes, 'https://example.invalid/test.cmpt');
		const view = new DataView(result.buffer);
		expect(view.getUint32(8, true)).toBe(result.length);
		expect(view.getUint32(24, true)).toBe(result.length - 16);
		expect(view.getUint32(44, true)).toBe(1);
	});
});

it('ローカルフォルダの外部bufferをネットワークに出さず読み込む', async () => {
	const network = vi.fn(() => {
		throw new Error('unexpected network');
	});
	vi.stubGlobal('fetch', network);
	const root = new File([
		JSON.stringify({
			asset: { version: '1.0' },
			root: { boundingVolume: { sphere: [0, 0, 0, 1] }, geometricError: 0 }
		})
	], 'tileset.json');
	const file = new File([new Uint8Array([1, 2, 3])], 'test.bin');
	const source = await registerLocalTileset([root, file], root);
	const urls = new Set<string>();
	try {
		const json = { buffers: [{ uri: 'test.bin' }] };
		await prepareGltfResources(json, source.url, new AbortController().signal, urls);
		expect(json.buffers[0].uri.startsWith('blob:')).toBe(true);
		expect(network).not.toHaveBeenCalled();
	} finally {
		urls.forEach(url => URL.revokeObjectURL(url));
		source.dispose();
	}
});

it('読み込み中の中止を外部リソースにも伝える', async () => {
	const abort = new AbortController();
	abort.abort();
	const urls = new Set<string>();
	vi.stubGlobal(
		'fetch',
		vi.fn(async (_url, init) => {
			init.signal.throwIfAborted();
			return new Response();
		})
	);
	await expect(
		prepareGltfResources(
			{ buffers: [{ uri: 'test.bin' }] },
			'https://example.invalid/',
			abort.signal,
			urls
		)
	).rejects.toThrow();
	expect(urls.size).toBe(0);
});
