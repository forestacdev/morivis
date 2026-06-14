import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { geoParquetFileToGeoJson } from '.';

const readFixtureFile = (relativePath: string): File => {
	const absolutePath = resolve(import.meta.dirname, '__fixtures__', relativePath);
	const bytes = readFileSync(absolutePath);
	return new File([bytes], relativePath.split('/').at(-1) ?? 'fixture.parquet', {
		type: 'application/octet-stream'
	});
};

describe('geoParquetFileToGeoJson', () => {
	it('GeoParquet fixture を Point の FeatureCollection として読み込める', async () => {
		const file = readFixtureFile('sample-point/sample-point.parquet');

		const result = await geoParquetFileToGeoJson(file);

		expect(result.geometryColumns).toEqual(['geometry']);
		expect(result.primaryGeometryColumn).toBe('geometry');
		expect(result.sourceCrsName).toBe('EPSG:4326');
		expect(result.sourceEpsgCode).toBe('4326');
		expect(result.geojson.features).toHaveLength(1);
		expect(result.geojson.features[0]?.geometry).toEqual({
			type: 'Point',
			coordinates: [139.6917, 35.6895]
		});
		expect(result.geojson.features[0]?.properties).toEqual({
			name: 'Sample Point',
			elevation: 44.3
		});
	});

	it('Geo metadata が無い Parquet は geometry 列なしとして失敗する', async () => {
		const file = readFixtureFile('plain-point/plain-point.parquet');

		await expect(geoParquetFileToGeoJson(file)).rejects.toThrow(
			'GeoParquetのgeometry列が見つかりませんでした'
		);
	});
});
