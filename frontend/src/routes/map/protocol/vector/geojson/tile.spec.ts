import { pointToTile, tileToBBOX } from '@mapbox/tilebelt';
import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';
import { describe, expect, it } from 'vitest';
import { createGeojsonTile } from './tile';

describe('GeoJSON共通タイルの座標', () => {
	it.each([5, 9, 11, 18])('ズーム%sで図郭の枠線とラベルの元座標を保持する', z => {
		const [x, y] = pointToTile(1, 1, z);
		const [west, south, east, north] = tileToBBOX([x, y, z]);
		const center = [(west + east) / 2, (south + north) / 2];
		const min = [west + (east - west) / 4, south + (north - south) / 4];
		const max = [east - (east - west) / 4, north - (north - south) / 4];
		const result = createGeojsonTile({
			z,
			x,
			y,
			transform: 'topographic-sheets',
			geojson: {
				type: 'FeatureCollection',
				features: [{
					type: 'Feature',
					properties: { 図名: 'test-sheet', 図郭座標: [min, max] },
					geometry: { type: 'Point', coordinates: center }
				}]
			}
		});
		const layer = new VectorTile(new Pbf(result)).layers.geojsonLayer;
		expect(layer.extent).toBe(4096);
		const line = layer.feature(0).toGeoJSON(x, y, z).geometry;
		const point = layer.feature(1).toGeoJSON(x, y, z).geometry;
		if (line.type !== 'LineString' || point.type !== 'Point') {
			throw new Error('Unexpected geometry');
		}
		const expectedLine = [min, [max[0], min[1]], max, [min[0], max[1]], min];
		for (const [index, expected] of [...expectedLine, center].entries()) {
			const actual = index < expectedLine.length
				? line.coordinates[index]
				: point.coordinates;
			expect(Math.abs(actual[0] - expected[0])).toBeLessThan((east - west) / 4096);
			expect(Math.abs(actual[1] - expected[1])).toBeLessThan((north - south) / 4096);
		}
	});
	it('通常レイヤーは図郭の変換を適用せず、元のgeometryと属性を保持する', () => {
		const [x, y, z] = pointToTile(1, 1, 11);
		const data = createGeojsonTile({
			z,
			x,
			y,
			geojson: {
				type: 'FeatureCollection',
				features: [{
					type: 'Feature',
					properties: { name: 'test-normal', code: 'test-code' },
					geometry: { type: 'Point', coordinates: [1, 1] }
				}]
			}
		});
		const layer = new VectorTile(new Pbf(data)).layers.geojsonLayer;
		expect(layer.length).toBe(1);
		expect(layer.feature(0).properties).toEqual({ name: 'test-normal', code: 'test-code' });
		const point = layer.feature(0).toGeoJSON(x, y, z).geometry;
		if (point.type !== 'Point') throw new Error('Expected Point');
		expect(point.coordinates[0]).toBeCloseTo(1, 4);
		expect(point.coordinates[1]).toBeCloseTo(1, 4);
	});
});
