import { Tile3DLayer } from '@deck.gl/geo-layers';
import { load, type Loader } from '@loaders.gl/core';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeTilesetResponse, fetchTilesetResource } from './fetch-resource';

const url = 'https://example.invalid/test-tiles/data/test.glb';
const responseAt = (body: BodyInit, headers?: HeadersInit) => {
	const response = new Response(body, { headers });
	Object.defineProperty(response, 'url', { value: url });
	return response;
};

afterEach(() => vi.unstubAllGlobals());

describe('3D TilesのURL読み込み', () => {
	it('gzipヘッダーがチャンクをまたいでも展開し、リソースの基準URLを保持する', async () => {
		const source = new TextEncoder().encode('{"asset":{"version":"1.1"}}');
		const gzip = gzipSync(source);
		const stream = new ReadableStream<Uint8Array>({
			start: (controller) => {
				controller.enqueue(gzip.subarray(0, 1));
				controller.enqueue(gzip.subarray(1));
				controller.close();
			}
		});
		const decoded = await decodeTilesetResponse(responseAt(stream, {
			'Content-Type': 'application/json',
			'Content-Length': String(gzip.length)
		}));
		expect(decoded.url).toBe(url);
		expect(decoded.headers.get('Content-Type')).toBe('application/json');
		expect(decoded.headers.has('Content-Length')).toBe(false);
		expect(await decoded.json()).toEqual({ asset: { version: '1.1' } });
	});

	it('HTTPで自動展開済みならContent-Encodingが残っていても二重展開しない', async () => {
		const decoded = await decodeTilesetResponse(responseAt('glTFtest', {
			'Content-Encoding': 'gzip'
		}));
		expect(await decoded.text()).toBe('glTFtest');
	});

	it('圧縮GLBをURLから取得し、実際の3D Tileローダーで解析できる', async () => {
		const json = JSON.stringify({
			asset: { version: '2.0' },
			scenes: [{ nodes: [] }],
			scene: 0
		});
		const chunk = new TextEncoder().encode(json.padEnd(Math.ceil(json.length / 4) * 4, ' '));
		const glb = new Uint8Array(20 + chunk.length);
		const header = new DataView(glb.buffer);
		[0x46546c67, 2, glb.length, chunk.length, 0x4e4f534a].forEach((value, index) =>
			header.setUint32(index * 4, value, true)
		);
		glb.set(chunk, 20);
		vi.stubGlobal('fetch', vi.fn(async () => responseAt(new Uint8Array(gzipSync(glb)))));
		const loaded = await load(url, Tile3DLayer.defaultProps.loader as Loader, {
			fetch: fetchTilesetResource,
			'3d-tiles': { loadGLTF: false }
		}) as { gltfArrayBuffer: ArrayBuffer; };
		expect(new Uint8Array(loaded.gltfArrayBuffer)).toEqual(glb);
	});

	it('HTTPエラーはステータスを保って返す', async () => {
		const response = new Response('test-missing', { status: 404 });
		expect(await decodeTilesetResponse(response)).toBe(response);
		expect(await response.text()).toBe('test-missing');
	});

	it('壊れたgzipは空のタイルとして扱わず読み込みエラーにする', async () => {
		const decoded = await decodeTilesetResponse(responseAt(new Uint8Array([0x1f, 0x8b, 8, 0])));
		await expect(decoded.arrayBuffer()).rejects.toThrow();
	});

	it('本文のキャンセルを元のストリームへ伝える', async () => {
		const cancel = vi.fn();
		const stream = new ReadableStream<Uint8Array>({
			start: controller => controller.enqueue(new TextEncoder().encode('glTF')),
			cancel
		});
		const decoded = await decodeTilesetResponse(responseAt(stream));
		await decoded.body!.cancel('test-cancel');
		expect(cancel).toHaveBeenCalledWith('test-cancel');
	});

	it('リクエストの認証設定とAbortSignalをfetchへ渡す', async () => {
		const fetch = vi.fn(async () => responseAt('glTF'));
		vi.stubGlobal('fetch', fetch);
		const init = { credentials: 'include' as const, signal: new AbortController().signal };
		const response = await fetchTilesetResource(url, init);
		expect(fetch).toHaveBeenCalledWith(url, init);
		await response.body!.cancel();
	});

	it('ローカルフォルダ外への参照をネットワークへ送らない', async () => {
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		await expect(fetchTilesetResource('https://morivis-local.invalid/test-outside.glb'))
			.rejects.toThrow('フォルダの外');
		expect(fetch).not.toHaveBeenCalled();
	});
});
