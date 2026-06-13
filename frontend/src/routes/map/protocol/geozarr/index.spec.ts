import { describe, expect, it } from 'vitest';

import {
	buildCategoricalMeta,
	buildGeoZarrSampleWindows,
	mergeBandDataRanges,
	mergeSampleRangeWithFallback,
	normalizeGeoZarrBbox,
	normalizeGeoZarrUrl,
	parseBboxFromAttrs,
	parseProjectionCodeFromAttrs,
	resolveGeoZarrFallbackRange
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

describe('GeoZarr categorical helpers', () => {
	it('flag_values と flag_meanings からカテゴリ metadata を作れる', () => {
		expect(
			buildCategoricalMeta('categorical_precipitation_type_surface', {
				flag_values: [0, 1, 2, 3],
				flag_meanings: 'no_precip rain snow freezing_rain'
			})
		).toEqual({
			values: [0, 1, 2, 3],
			labels: ['no_precip', 'rain', 'snow', 'freezing_rain'],
			colors: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072']
		});
	});

	it('カテゴリ情報が無ければ null を返す', () => {
		expect(
			buildCategoricalMeta('dew_point_temperature_2m', {
				standard_name: 'dew_point_temperature'
			})
		).toBeNull();
	});
});

describe('GeoZarr sample range helpers', () => {
	it('全球配列向けに角4点と中央のサンプル window を作る', () => {
		expect(buildGeoZarrSampleWindows(1440, 721)).toEqual([
			{ xStart: 0, xEnd: 96, yStart: 0, yEnd: 96 },
			{ xStart: 1344, xEnd: 1440, yStart: 0, yEnd: 96 },
			{ xStart: 0, xEnd: 96, yStart: 625, yEnd: 721 },
			{ xStart: 1344, xEnd: 1440, yStart: 625, yEnd: 721 },
			{ xStart: 672, xEnd: 768, yStart: 312, yEnd: 408 }
		]);
	});

	it('ECMWF dew_point_temperature_2m のような全球データでは複数 window の min/max を合成する', () => {
		const merged = mergeBandDataRanges([
			{ min: -30.625, max: -8.5 },
			{ min: -33.25, max: -19.875 },
			{ min: -57.5, max: -0.2734375 },
			{ min: -57, max: -2.984375 },
			{ min: -5.0625, max: 26.125 }
		]);

		expect(merged.min).toBe(-57.5);
		expect(merged.max).toBe(26.125);
	});

	it('小さい配列では重複しない window だけを返す', () => {
		expect(buildGeoZarrSampleWindows(32, 16)).toEqual([{
			xStart: 0,
			xEnd: 32,
			yStart: 0,
			yEnd: 16
		}]);
	});

	it('standard_name から dew point の fallback range を引ける', () => {
		expect(resolveGeoZarrFallbackRange({ standard_name: 'dew_point_temperature' })).toEqual({
			displayRange: { min: -60, max: 30 },
			sliderRange: { min: -90, max: 40 },
			colorMap: 'jet'
		});
	});

	it('sample range が狭すぎるときは fallback で広げる', () => {
		expect(
			mergeSampleRangeWithFallback(
				{ min: -5.0625, max: 26.125 },
				{ min: -60, max: 30 }
			)
		).toEqual({ min: -60, max: 30 });
	});

	it('sample range が fallback より広いときは sample を維持する', () => {
		expect(
			mergeSampleRangeWithFallback(
				{ min: -72, max: 33 },
				{ min: -60, max: 30 }
			)
		).toEqual({ min: -72, max: 33 });
	});
});
