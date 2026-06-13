import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { csvTextToGeojson, getCSVPreview } from '.';

vi.mock('$routes/stores/notification', () => ({
	showNotification: vi.fn()
}));

const readFixture = (fileName: string) =>
	readFileSync(resolve(import.meta.dirname, '__fixtures__', fileName), 'utf8');

describe('csv parser', () => {
	it('プレビュー用にヘッダーと行を返す', async () => {
		const preview = await getCSVPreview(`name,lat,lon\nalpha,35.0,139.0\nbeta,36.0,140.0`);

		expect(preview.headers).toEqual(['name', 'lat', 'lon']);
		expect(preview.rows).toHaveLength(2);
		expect(preview.rows[0]).toMatchObject({ name: 'alpha', lat: 35, lon: 139 });
	});

	it('10進数と度分秒文字列を Point に変換する', async () => {
		const geojson = await csvTextToGeojson(readFixture('sample.csv'), 'lat', 'lon');

		expect(geojson.features).toHaveLength(2);
		expect(geojson.features[0]?.geometry.coordinates).toEqual([139.6917, 35.6895]);
		expect(geojson.features[1]?.geometry.type).toBe('Point');
		expect(geojson.features[1]?.properties?.name).toBe('beta');
	});

	it('指定カラムが無いときは reject する', async () => {
		await expect(csvTextToGeojson(readFixture('missing-columns.csv'), 'lat', 'lon')).rejects.toThrow(
			`Latitude column 'lat' not found`
		);
	});
});
