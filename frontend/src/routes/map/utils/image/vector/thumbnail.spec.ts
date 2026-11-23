import { MapRenderer } from '@ml2drender/wasm';
import geojsonVt from 'geojson-vt';
import { MercatorCoordinate } from 'maplibre-gl';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import vtpbf from 'vt-pbf';
import { thumbnailStyle } from './__fixtures__/thumbnail';
import { createThumbnailStyle, createThumbnailView } from './thumbnail';

describe('ベクターのサムネイル', () => {
	it('日付変更線をまたぐ範囲を中央に収める', () => {
		const view = createThumbnailView([170, -5, -170, 5]);
		expect(view.center[0]).toBeCloseTo(180);
		expect(view.center[1]).toBeCloseTo(0);
		expect(view.zoom).toBeCloseTo(Math.log2(360 / 20));
	});

	it('縦長の範囲でも縦横比を保ち、上下端を画像内に収める', () => {
		const view = createThumbnailView([-1, 40, 1, 60]);
		const center = MercatorCoordinate.fromLngLat(view.center);
		const north = MercatorCoordinate.fromLngLat([0, 60]);
		const south = MercatorCoordinate.fromLngLat([0, 40]);
		const scale = 512 * 2 ** view.zoom;
		expect((center.y - north.y) * scale).toBeCloseTo(256);
		expect((south.y - center.y) * scale).toBeCloseTo(256);
		expect(view.width).toBe(512);
		expect(view.height).toBe(512);
	});

	it('一点だけの範囲と極の緯度でも有限のカメラを返す', () => {
		expect(createThumbnailView([0, 0, 0, 0])).toMatchObject({ center: [0, 0], zoom: 22 });
		const view = createThumbnailView([-180, -90, 180, 90]);
		expect(view.zoom).toBe(0);
		expect(view.center.every(Number.isFinite)).toBe(true);
		expect(() => createThumbnailView([NaN, 0, 1, 1])).toThrow();
	});

	it('WASMで点・線・立体ポリゴンの上面を描画し、WebPを生成する', async () => {
		const wasm = await WebAssembly.compile(
			readFileSync(createRequire(import.meta.url).resolve('@ml2drender/wasm/renderer.wasm'))
		);
		const style = createThumbnailStyle(thumbnailStyle);
		expect(thumbnailStyle.layers[2].type).toBe('fill-extrusion');
		expect(style.layers[2]).toMatchObject({
			type: 'fill',
			filter: ['==', '$type', 'Polygon'],
			paint: { 'fill-color': ['get', 'color'] }
		});
		const renderer = await MapRenderer.init(style, { wasm, cache: { ttlMs: 0 } });
		const image = await renderer.renderView(createThumbnailView([-3, -3, 3, 3]));
		const colors = new Set<string>();
		for (let i = 0; i < image.data.length; i += 4) {
			colors.add(image.data.slice(i, i + 4).join(','));
		}
		expect(colors).toContain('255,0,0,255');
		expect(colors).toContain('0,255,0,255');
		expect(colors).toContain('0,0,255,255');
		expect(colors).toContain('0,0,0,0');
		expect([image.width, image.height]).toEqual([512, 512]);
		expect(new TextDecoder().decode(image.toWebp().slice(8, 12))).toBe('WEBP');
	});

	it('MVTタイルを取得し、source-layerと属性による色指定を反映する', async () => {
		const source = thumbnailStyle.sources['test-vector'];
		if (source.type !== 'geojson' || typeof source.data === 'string') {
			throw new Error('Invalid fixture');
		}
		const tileIndex = geojsonVt(source.data, {});
		const style = createThumbnailStyle(thumbnailStyle);
		style.sources = {
			'test-vector': {
				type: 'vector',
				tiles: ['https://test.invalid/tiles/{z}/{x}/{y}.pbf'],
				maxzoom: 4
			}
		};
		style.layers = style.layers.map(layer => ({ ...layer, 'source-layer': 'test-features' }));
		const requested: string[] = [];
		const renderer = await MapRenderer.init(style, {
			wasm: await WebAssembly.compile(
				readFileSync(
					createRequire(import.meta.url).resolve('@ml2drender/wasm/renderer.wasm')
				)
			),
			cache: { ttlMs: 0 },
			loadResource: async url => {
				requested.push(url);
				const [z, x, y] = new URL(url).pathname.slice('/tiles/'.length).replace('.pbf', '')
					.split('/').map(Number);
				const tile = tileIndex.getTile(z, x, y);
				return tile
					? new Uint8Array(vtpbf.fromGeojsonVt({
						'test-features': tile as unknown as ReturnType<typeof geojsonVt>
					}))
					: null;
			}
		});
		const image = await renderer.renderView(createThumbnailView([-3, -3, 3, 3]));
		expect(requested.length).toBeGreaterThan(0);
		const bluePixels = image.data.filter((value, index) =>
			index % 4 === 2 && value === 255 && image.data[index - 1] === 0
			&& image.data[index - 2] === 0
		);
		expect(bluePixels.length).toBeGreaterThan(0);
	});
});
