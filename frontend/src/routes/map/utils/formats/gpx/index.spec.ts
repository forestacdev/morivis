import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkGpxFile, gpxFileToGeojson } from '.';

const gpxText = readFileSync(resolve(import.meta.dirname, '__fixtures__', 'sample.gpx'), 'utf8');

const createGpxFile = () =>
	({
		text: async () => gpxText
	}) as File;

describe('gpx parser', () => {
	it('GPX に含まれる要素種別を判定できる', async () => {
		const result = await checkGpxFile(createGpxFile());

		expect(result).toEqual({
			tracks: true,
			track_points: true,
			routes: true,
			waypoints: true
		});
	});

	it('tracks を LineString の FeatureCollection に変換する', async () => {
		const geojson = await gpxFileToGeojson(createGpxFile(), 'tracks');

		expect(geojson.features).toHaveLength(1);
		expect(geojson.features[0]?.geometry.type).toBe('LineString');
		expect(geojson.features[0]?.properties?.name).toBe('Sample Track');
		expect(geojson.features[0]?.properties?.time).toBe('2024-01-01T09:00:00+09:00');
	});

	it('waypoints を Point の FeatureCollection に変換する', async () => {
		const geojson = await gpxFileToGeojson(createGpxFile(), 'waypoints');

		expect(geojson.features).toHaveLength(1);
		expect(geojson.features[0]?.geometry.coordinates).toEqual([139.6917, 35.6895]);
		expect(geojson.features[0]?.properties?.name).toBe('Tokyo');
	});
});
