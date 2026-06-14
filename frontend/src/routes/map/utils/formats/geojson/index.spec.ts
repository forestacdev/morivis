import { describe, expect, it } from 'vitest';
import {
	GeoJsonParseError,
	geoJsonTextToGeoJson,
	normalizeGeoJsonGeometryCollections
} from './index';

describe('geojson parser', () => {
	it('GeometryCollection を複数 feature に正規化する', () => {
		const geojson = normalizeGeoJsonGeometryCollections({
			type: 'Feature',
			id: 'road-1',
			properties: { name: 'sample' },
			geometry: {
				type: 'GeometryCollection',
				geometries: [
					{
						type: 'Point',
						coordinates: [139.7, 35.6]
					},
					{
						type: 'LineString',
						coordinates: [
							[139.7, 35.6],
							[139.8, 35.7]
						]
					}
				]
			}
		});

		expect(geojson.features).toHaveLength(2);
		expect(geojson.features[0]?.id).toBe('road-1_0');
		expect(geojson.features[1]?.id).toBe('road-1_1');
		expect(geojson.features[0]?.properties?.name).toBe('sample');
	});

	it('単一 geometry の GeoJSON も FeatureCollection にそろえる', () => {
		const geojson = geoJsonTextToGeoJson(
			JSON.stringify({
				type: 'Point',
				coordinates: [139.6917, 35.6895]
			})
		);

		expect(geojson.type).toBe('FeatureCollection');
		expect(geojson.features).toHaveLength(1);
		expect(geojson.features[0]?.geometry.type).toBe('Point');
	});

	it('壊れた JSON では GeoJsonParseError を投げる', () => {
		expect(() => geoJsonTextToGeoJson('{')).toThrow(GeoJsonParseError);
		expect(() => geoJsonTextToGeoJson('{')).toThrow('GeoJSONのJSON構文が壊れています');
	});
});
