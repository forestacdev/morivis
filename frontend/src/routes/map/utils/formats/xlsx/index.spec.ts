import { describe, expect, it, vi } from 'vitest';

import { xlsxRowsToGeojson, xlsxRowsToPreview } from '.';

vi.mock('$routes/stores/notification', () => ({
	showNotification: vi.fn()
}));

describe('xlsx parser', () => {
	it('先頭行をヘッダーとしてプレビューに変換する', () => {
		const preview = xlsxRowsToPreview([
			['name', 'lat', 'lon'],
			['alpha', 35.6895, 139.6917],
			['beta', 36.2048, 138.2529]
		]);

		expect(preview.headers).toEqual(['name', 'lat', 'lon']);
		expect(preview.rows).toHaveLength(2);
		expect(preview.rows[0]).toMatchObject({
			name: 'alpha',
			lat: 35.6895,
			lon: 139.6917
		});
	});

	it('空ヘッダーと重複ヘッダーを補完する', () => {
		const preview = xlsxRowsToPreview([
			['', 'lat', 'lat'],
			['alpha', 35.6895, 139.6917]
		]);

		expect(preview.headers).toEqual(['column_1', 'lat', 'lat_2']);
	});

	it('シート行配列から Point GeoJSON に変換する', () => {
		const geojson = xlsxRowsToGeojson(
			[
				['name', 'lat', 'lon'],
				['alpha', 35.6895, 139.6917],
				['beta', `35°40'0"`, `139°45'0"`]
			],
			'lat',
			'lon'
		);

		expect(geojson.features).toHaveLength(2);
		expect(geojson.features[0]?.geometry.coordinates).toEqual([139.6917, 35.6895]);
		expect(geojson.features[1]?.geometry.type).toBe('Point');
	});

	it('先頭の空白行は飛ばして最初の非空行をヘッダーとして使う', () => {
		const preview = xlsxRowsToPreview([
			['', '', '', ''],
			['NO', '会社名2', '店所コード', '標識NO'],
			[1, '北海道電力NW', 211, ''],
			[2, '北海道電力NW', 215, '']
		]);

		expect(preview.headers).toEqual(['NO', '会社名2', '店所コード', '標識NO']);
		expect(preview.rows).toHaveLength(2);
		expect(preview.rows[0]).toMatchObject({
			NO: 1,
			会社名2: '北海道電力NW',
			店所コード: 211
		});
	});

	it('プレビューでは全セル空白の行を飛ばす', () => {
		const preview = xlsxRowsToPreview([
			['', 'name', 'lat', 'lon'],
			['', '', '', ''],
			[' ', '   ', '\t', ' '],
			['', 'alpha', 35.6895, 139.6917],
			['', 'beta', 36.2048, 138.2529]
		]);

		expect(preview.headers).toEqual(['name', 'lat', 'lon']);
		expect(preview.rows).toHaveLength(2);
		expect(preview.rows[0]).toMatchObject({
			name: 'alpha',
			lat: 35.6895,
			lon: 139.6917
		});
		expect(preview.rows[1]).toMatchObject({
			name: 'beta',
			lat: 36.2048,
			lon: 138.2529
		});
	});

	it('空の先頭列を落としたあとも残る無名列を column_1 として使える', () => {
		const rows = [
			['', '', 'lon'],
			['', 139.6917, 35.6895],
			['', 138.2529, 36.2048]
		];

		const preview = xlsxRowsToPreview(rows);
		expect(preview.headers).toEqual(['column_1', 'lon']);
		expect(preview.rows[0]).toMatchObject({
			column_1: 139.6917,
			lon: 35.6895
		});

		const geojson = xlsxRowsToGeojson(rows, 'lon', 'column_1');
		expect(geojson.features).toHaveLength(2);
		expect(geojson.features[0]?.geometry.coordinates).toEqual([139.6917, 35.6895]);
		expect(geojson.features[1]?.geometry.coordinates).toEqual([138.2529, 36.2048]);
	});
});
