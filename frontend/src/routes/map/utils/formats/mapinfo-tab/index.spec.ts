import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { normalizeMapInfoGeoJson } from '.';
import { convertMapInfoTab, type Gdal } from './convert';

const require = createRequire(import.meta.url);
let gdal: Gdal;
const source = JSON.parse(
	readFileSync(new URL('./__fixtures__/test-source.geojson', import.meta.url), 'utf8')
);
beforeAll(async () => {
	// Node版EmscriptenがローカルWASMをfetchしないようにする。入力は同梱fixtureだけ。
	const fetch = globalThis.fetch;
	vi.stubGlobal('fetch', undefined);
	try {
		gdal = await require('gdal3.js/node')({
			path: 'node_modules/gdal3.js/dist/package',
			useWorker: false,
			logHandler: () => {},
			errorHandler: () => {}
		});
	} finally {
		vi.stubGlobal('fetch', fetch);
	}
});
const convert = (name: string, crs?: string) =>
	convertMapInfoTab(
		gdal,
		fileURLToPath(new URL(`./__fixtures__/${name}.tab`, import.meta.url)),
		crs
	);

describe('MapInfo Native TAB', () => {
	it('実際のGDALで点・線・穴のある面と日本語・数値属性を読む', async () => {
		const result = await convert('test-native');
		expect(result.spatialStatus).toBe('resolved');
		expect(result.geojson.features.map(f => f.geometry.type)).toEqual([
			'Point',
			'LineString',
			'Polygon'
		]);
		expect(result.geojson.features.map(f => f.properties.name)).toEqual(
			source.features.map((f: { properties: { name: string; }; }) => f.properties.name)
		);
		expect(result.geojson.features.map(f => f.properties.value)).toEqual([12.5, -2, 0]);
		const polygon = result.geojson.features[2].geometry;
		if (polygon.type !== 'Polygon') throw new Error('test-polygon');
		expect(polygon.coordinates).toHaveLength(2);
		expect(result.omittedCount).toBe(0);
	});
	it('MAP内の投影座標系を読み、経緯度の軸順へ変換する', async () => {
		const result = await convert('test-projected');
		expect(result.geojson.features).toHaveLength(3);
		expect(result.spatialStatus).toBe('resolved');
		expect(result.sourceWkt).toContain('PROJCRS');
		const point = result.geojson.features[0].geometry;
		if (point.type !== 'Point') throw new Error('test-point');
		expect(point.coordinates[0]).toBeCloseTo(2.5, 5);
		expect(point.coordinates[1]).toBeCloseTo(1.25, 5);
		expect(result.geojson.features[0].properties.name).toBe('架空ポイント');
	});
	it('NonEarthは緯度経度の範囲内でも決めつけず、選択された座標系で再変換する', async () => {
		const local = await convert('test-local');
		expect(local.geojson.features).toHaveLength(3);
		expect(local.spatialStatus).toBe('crs-missing');
		expect(local.sourceWkt).toMatch(/ENGCRS|LOCAL_CS/);
		const result = await convert('test-local', 'EPSG:4326');
		expect(result.spatialStatus).toBe('resolved');
		const point = result.geojson.features[0].geometry;
		if (point.type !== 'Point') throw new Error('test-point');
		expect(point.coordinates[0]).toBeCloseTo(2.5, 2);
	});
	it('不正な指定座標系で黙って登録しない', async () => {
		await expect(convert('test-local', 'test-invalid-crs')).rejects.toThrow('指定した座標系');
	});
});

describe('MapInfo conversion validation', () => {
	it('図形のない行だけを除外し、除外数を返す', () => {
		const result = normalizeMapInfoGeoJson({
			...source,
			features: [
				{ type: 'Feature', geometry: null, properties: { name: 'test-empty' } },
				...source.features
			]
		}, true);
		expect(result.omittedCount).toBe(1);
		expect(result.geojson.features).toHaveLength(3);
	});
	it('不正・空・範囲外の座標を拒否する', () => {
		expect(() => normalizeMapInfoGeoJson({}, true)).toThrow();
		expect(() => normalizeMapInfoGeoJson({ type: 'FeatureCollection', features: [] }, true))
			.toThrow('図形');
		for (const coordinates of [[500, 0], [NaN, 0], [0, 91]]) {
			expect(() =>
				normalizeMapInfoGeoJson({
					type: 'FeatureCollection',
					features: [{
						type: 'Feature',
						geometry: { type: 'Point', coordinates },
						properties: {}
					}]
				}, true)
			).toThrow();
		}
	});
});
