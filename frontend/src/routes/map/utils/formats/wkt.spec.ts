import { describe, expect, it } from 'vitest';
import { WktParseError, wktTextToGeojson } from './wkt';

describe('wkt parser', () => {
	it('単一 WKT を FeatureCollection に変換できる', () => {
		const result = wktTextToGeojson('POINT (139.6917 35.6895)', 'sample.wkt');

		expect(result.geojson.features).toHaveLength(1);
		expect(result.geojson.features[0]?.geometry.type).toBe('Point');
		expect(result.geojson.features[0]?.id).toBe('sample.wkt_0');
		expect(result.epsgCode).toBeNull();
	});

	it('SRID 付き複数行 WKT をまとめて変換できる', () => {
		const result = wktTextToGeojson(
			['SRID=4326;POINT (139.6917 35.6895)', 'SRID=4326;LINESTRING (139.6 35.6, 139.7 35.7)'].join(
				'\n'
			),
			'multi.wkt'
		);

		expect(result.geojson.features).toHaveLength(2);
		expect(result.geojson.features[1]?.geometry.type).toBe('LineString');
		expect(result.epsgCode).toBe('4326');
	});

	it('空入力では WktParseError を投げる', () => {
		expect(() => wktTextToGeojson('   ')).toThrow(WktParseError);
		expect(() => wktTextToGeojson('   ')).toThrow('WKTファイルが空です');
	});
});
