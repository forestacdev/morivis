import { describe, expect, it } from 'vitest';

import {
	normalizeGeoZarrBbox,
	normalizeGeoZarrUrl,
	parseBboxFromAttrs,
	parseProjectionCodeFromAttrs
} from '.';

describe('GeoZarr bbox helpers', () => {
	it('spatial:bbox を属性から読める', () => {
		expect(
			parseBboxFromAttrs({
				'spatial:bbox': [600005, 7890245, 709795, 8000035]
			})
		).toEqual([600005, 7890245, 709795, 8000035]);
	});

	it('proj:code を EPSG コードとして読める', () => {
		expect(parseProjectionCodeFromAttrs({ 'proj:code': 'EPSG:32625' })).toBe('EPSG:32625');
		expect(
			parseProjectionCodeFromAttrs({
				crs: 'http://www.opengis.net/def/crs/EPSG/0/32625'
			})
		).toBe('EPSG:32625');
	});

	it('投影座標の bbox を WGS84 に正規化できる', () => {
		const bbox = normalizeGeoZarrBbox([600005, 7890245, 709795, 8000035], 'EPSG:32625');

		expect(bbox[0]).toBeCloseTo(-30.2336868, 5);
		expect(bbox[1]).toBeCloseTo(71.0252446, 5);
		expect(bbox[2]).toBeCloseTo(-26.9065947, 5);
		expect(bbox[3]).toBeCloseTo(72.0778477, 5);
	});

	it('.zmetadata URL を dataset root に正規化できる', () => {
		expect(
			normalizeGeoZarrUrl(
				'https://us-west-2.opendata.source.coop/pangeo/geozarr-examples/TCI.zarr/.zmetadata'
			)
		).toBe('https://us-west-2.opendata.source.coop/pangeo/geozarr-examples/TCI.zarr');
	});
});
