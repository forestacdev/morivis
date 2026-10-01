import proj4 from 'proj4';
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
} from './runtime';

describe('GeoZarr bbox helpers', () => {
	it('spatial:bbox を属性から読める', () => {
		expect(
			parseBboxFromAttrs({
				'spatial:bbox': [-100, -100, 100, 100]
			})
		).toEqual([-100, -100, 100, 100]);
	});

	it('proj:code を EPSG コードとして読める', () => {
		expect(parseProjectionCodeFromAttrs({ 'proj:code': 'EPSG:3857' })).toBe('EPSG:3857');
		expect(
			parseProjectionCodeFromAttrs({
				crs: 'http://www.opengis.net/def/crs/EPSG/0/3857'
			})
		).toBe('EPSG:3857');
	});

	it('投影座標の bbox を WGS84 に正規化できる', () => {
		const bbox = normalizeGeoZarrBbox([-100, -100, 100, 100], 'EPSG:3857');

		const lower = proj4('EPSG:3857', 'EPSG:4326', [-100, -100]);
		const upper = proj4('EPSG:3857', 'EPSG:4326', [100, 100]);
		expect(bbox).toEqual([...lower, ...upper]);
	});

	it('.zmetadata URL を dataset root に正規化できる', () => {
		expect(
			normalizeGeoZarrUrl(
				'https://test-zarr.invalid/test-grid.zarr/.zmetadata'
			)
		).toBe('https://test-zarr.invalid/test-grid.zarr');
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

	it('架空の全球配列では複数 window の min/max を合成する', () => {
		const merged = mergeBandDataRanges([
			{ min: -30, max: -8.5 },
			{ min: -35, max: -20 },
			{ min: -60, max: -1 },
			{ min: -57, max: -3 },
			{ min: -5, max: 25 }
		]);

		expect(merged.min).toBe(-60);
		expect(merged.max).toBe(25);
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
				{ min: -5, max: 25 },
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
