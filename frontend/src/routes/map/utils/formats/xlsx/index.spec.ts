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

	it('ヘッダー行番号を指定してプレビューと Point GeoJSON に変換する', () => {
		const rows = [
			['title row'],
			['name', 'lat', 'lon'],
			['alpha', 35.6895, 139.6917],
			['beta', 36.2048, 138.2529]
		];

		const preview = xlsxRowsToPreview(rows, { headerRowNumber: 2, previewRowCount: 5 });
		expect(preview.headers).toEqual(['name', 'lat', 'lon']);
		expect(preview.rows).toHaveLength(2);
		expect(preview.rows[0]).toMatchObject({
			name: 'alpha',
			lat: 35.6895,
			lon: 139.6917
		});

		const geojson = xlsxRowsToGeojson(rows, 'lat', 'lon', 2);
		expect(geojson.features).toHaveLength(2);
		expect(geojson.features[1]?.geometry.coordinates).toEqual([138.2529, 36.2048]);
	});
});
