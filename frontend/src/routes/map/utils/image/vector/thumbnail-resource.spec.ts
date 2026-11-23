import { registerLocalMvt } from '$routes/map/protocol/vector/local-mvt';
import { createPointTile } from '$routes/map/utils/formats/mlt/__fixtures__/point';
import { VectorTile } from '@mapbox/vector-tile';
import { MapRenderer } from '@ml2drender/wasm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import Pbf from 'pbf';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { thumbnailStyle } from './__fixtures__/thumbnail';
import { createTestMvt, createTestPmtiles } from './__fixtures__/tiles';
import { createThumbnailStyle, createThumbnailView, MLT_RESOURCE_PREFIX } from './thumbnail';
import { thumbnailMltToMvt } from './thumbnail-mlt';
import { createThumbnailResourceLoader } from './thumbnail-resource';

afterEach(() => vi.unstubAllGlobals());

describe('サムネイルのタイル取得', () => {
	it('PMTilesのTileJSONと実タイルを読み、WASMで描画する', async () => {
		const archive = createTestPmtiles(createTestMvt());
		const fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
			const range = new Headers(init?.headers).get('range')!;
			const [start, end] = range.replace('bytes=', '').split('-').map(Number);
			return new Response(archive.slice(start, end + 1), { status: 206 });
		});
		vi.stubGlobal('fetch', fetch);
		const style = createThumbnailStyle(thumbnailStyle);
		style.sources = {
			'test-vector': { type: 'vector', url: 'pmtiles://https://test.invalid/test.pmtiles' }
		};
		style.layers = style.layers.map(layer => ({ ...layer, 'source-layer': 'test-features' }));
		const load = createThumbnailResourceLoader(style, 'https://test.invalid/');
		const controller = new AbortController();
		const renderer = await MapRenderer.init(style, {
			wasm: await WebAssembly.compile(
				readFileSync(
					createRequire(import.meta.url).resolve('@ml2drender/wasm/renderer.wasm')
				)
			),
			cache: { ttlMs: 0 },
			loadResource: async url => (await load(url, controller)).bytes
		});
		const image = await renderer.renderView(createThumbnailView([-3, -3, 3, 3]));
		expect(image.data.some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
		expect(fetch).toHaveBeenCalled();
	});

	it('ローカルMLTを取得し、レイヤー名・座標・属性を維持したMVTにする', async () => {
		const runtime = registerLocalMvt({
			tiles: new Map([['0/0/0', new File([createPointTile()], 'test.mlt')]])
		});
		try {
			const style = createThumbnailStyle({
				...thumbnailStyle,
				sources: {
					'test-vector': { type: 'vector', encoding: 'mlt', tiles: [runtime.url] }
				}
			});
			expect(style.sources['test-vector']).toMatchObject({
				encoding: 'mvt',
				tiles: [`${MLT_RESOURCE_PREFIX}${runtime.url}`]
			});
			const load = createThumbnailResourceLoader(style, 'https://test.invalid/');
			const resource = await load(
				`${MLT_RESOURCE_PREFIX}${runtime.url.replace('{z}/{x}/{y}', '0/0/0')}`,
				new AbortController()
			);
			expect(resource.encoding).toBe('mlt');
			const tile = new VectorTile(new Pbf(thumbnailMltToMvt(resource.bytes!)));
			const layer = tile.layers['test-layer'];
			expect(layer.extent).toBe(4096);
			expect(layer.feature(0).properties).toEqual({ 'test-value': 7 });
			expect(layer.feature(0).loadGeometry()).toEqual([[{ x: 10, y: 20 }]]);
			expect(
				(await load(runtime.url.replace('{z}/{x}/{y}', '1/0/0'), new AbortController()))
					.bytes
			).toBeNull();
		} finally {
			runtime.dispose();
		}
	});

	it('空タイルと404をスキップし、通信失敗と中断を伝える', async () => {
		const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 404 }))
			.mockResolvedValueOnce(new Response(null, { status: 503 }));
		vi.stubGlobal('fetch', fetch);
		const load = createThumbnailResourceLoader(thumbnailStyle, 'https://test.invalid/');
		const controller = new AbortController();
		expect(await load('/test.pbf', controller)).toEqual({ bytes: null });
		await expect(load('/test.pbf', controller)).rejects.toThrow('503');
		controller.abort();
		await expect(load('/test.pbf', controller)).rejects.toThrow();
		expect(fetch).toHaveBeenCalledTimes(2);
	});
});
