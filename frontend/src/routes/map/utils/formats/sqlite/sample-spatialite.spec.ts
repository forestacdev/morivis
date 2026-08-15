import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import initSqlJs from 'sql.js';

import { parseGeometryBlob } from './geometry';
import { getGeometryColumnsForTable, parseGeometryColumnsRows } from './schema';

const wasmPath = new URL('../../../../../../static/sql-wasm.wasm', import.meta.url).pathname;
const samplePath = new URL('../../../../../../../sample/sql/あ.sqlite', import.meta.url);

describe('sample spatialite fixture', () => {
	it('sample/sql/あ.sqlite の geometry metadata と geometry blob を読める', async () => {
		const SQL = await initSqlJs({
			locateFile: () => wasmPath
		});
		const bytes = readFileSync(samplePath);
		const db = new SQL.Database(new Uint8Array(bytes));

		const geometryColumnsResult = db.exec('SELECT * FROM geometry_columns');
		const metadata = parseGeometryColumnsRows(
			geometryColumnsResult[0]?.columns ?? [],
			geometryColumnsResult[0]?.values ?? []
		);
		const geometryInfo = getGeometryColumnsForTable(metadata, 'all_day__georss');
		const geometryBlob = db.exec(
			"SELECT GEOMETRY FROM 'all_day__georss' LIMIT 1"
		)[0]?.values[0]?.[0];
		const geometry = parseGeometryBlob(geometryBlob as Uint8Array);

		expect(geometryInfo).toEqual([
			{
				columnName: 'geometry',
				geometryType: 1,
				srid: 4326,
				geometryFormat: 'SpatiaLite'
			}
		]);
		expect(geometry).toEqual({
			type: 'Point',
			coordinates: [-116.92333333333, 33.892333333333]
		});

		db.close();
	});
});
