import { createGeoJsonEntry } from '$routes/map/data/entries/vector';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cityGmlTextToGeoJson } from '.';
import { createCityGml2DEntry } from './entry';

vi.mock('$routes/map/data/entries/vector', () => ({
	createGeoJsonEntry: vi.fn(async () => ({
		type: 'vector',
		format: { type: 'geojson' },
		metaData: {}
	}))
}));

const buildings = readFileSync(
	new URL('./__fixtures__/test-buildings.gml', import.meta.url),
	'utf8'
);

describe('CityGMLの2D登録', () => {
	beforeEach(() => vi.clearAllMocks());

	it('標高と垂直な壁面を除き、属性と屋根の穴をGeoJSONエントリへ渡す', async () => {
		const result = cityGmlTextToGeoJson(buildings);
		const original = structuredClone(result.geojson);
		const entry = await createCityGml2DEntry('test-layer', result);
		const [data, geometryType, name, bounds, style, options] =
			vi.mocked(createGeoJsonEntry).mock.calls[0];
		expect(entry.type).toBe('vector');
		expect(entry.format.type).toBe('geojson');
		expect(geometryType).toBe('Polygon');
		expect(name).toBe('test-layer');
		expect(bounds).toEqual(result.bounds);
		expect(style).toBeUndefined();
		expect(options).toEqual({ attribution: 'CityGML' });
		expect(data.features).toHaveLength(2);
		expect(data.features[0].id).toBe(original.features[0].id);
		expect(data.features[0].properties).toEqual(original.features[0].properties);
		expect(data.features[0].geometry).toEqual({
			type: 'MultiPolygon',
			coordinates: [
				original.features[0].geometry.coordinates[1].map((ring) =>
					ring.map(([x, y]) => [x, y])
				)
			]
		});
		expect(data.features[1].geometry).toEqual({
			type: 'MultiPolygon',
			coordinates: original.features[1].geometry.coordinates.map((polygon) =>
				polygon.map((ring) => ring.map(([x, y]) => [x, y]))
			)
		});
		expect(result.geojson).toEqual(original);
	});

	it('壁面しかない建物を空のMultiPolygonとして登録しない', async () => {
		const result = cityGmlTextToGeoJson(buildings);
		result.geojson.features[0].geometry.coordinates = [
			result.geojson.features[0].geometry.coordinates[0]
		];
		await createCityGml2DEntry('test-layer', result);
		const data = vi.mocked(createGeoJsonEntry).mock.calls[0][0];
		expect(data.features.map((feature) => feature.id)).toEqual([
			result.geojson.features[1].id
		]);
	});

	it('2Dの面が一つも残らない場合は登録せずエラーにする', async () => {
		const result = cityGmlTextToGeoJson(buildings);
		result.geojson.features = [result.geojson.features[0]];
		result.geojson.features[0].geometry.coordinates = [
			result.geojson.features[0].geometry.coordinates[0]
		];
		await expect(createCityGml2DEntry('test-layer', result)).rejects.toThrow(
			'2Dで表示できる建物の面がありません'
		);
		expect(createGeoJsonEntry).not.toHaveBeenCalled();
	});

	it('GeoJSONエントリの作成失敗を呼び出し側へ伝える', async () => {
		vi.mocked(createGeoJsonEntry).mockResolvedValueOnce(undefined);
		await expect(createCityGml2DEntry('test-layer', cityGmlTextToGeoJson(buildings)))
			.rejects.toThrow('CityGMLの2Dレイヤーを作成できませんでした');
	});
});
