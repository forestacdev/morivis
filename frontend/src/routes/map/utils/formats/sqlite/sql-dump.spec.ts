import { readFileSync } from 'node:fs';

import initSqlJs from 'sql.js';
import { describe, expect, it } from 'vitest';

import { parseGeometryBlob } from './geometry';
import { createDatabaseFromBytes, parseSqlDump } from './sql-dump';

const wasmPath = new URL('../../../../../../static/sql-wasm.wasm', import.meta.url).pathname;
const samplePath = new URL('../../../../../../../sample/sql/ああああ.sql', import.meta.url);

describe('sql dump parser', () => {
	it('PostGIS SQL dump をテーブル定義として読める', () => {
		const sql = readFileSync(samplePath, 'utf-8');
		const tables = parseSqlDump(sql);

		expect(tables).toHaveLength(1);
		expect(tables[0]?.name).toBe('ああああ');
		expect(tables[0]?.geometryColumns).toEqual([
			{
				columnName: 'wkb_geometry',
				srid: 4326,
				geometryType: 'POINT',
				coordDimension: 2
			}
		]);
		expect(tables[0]?.rows.length).toBeGreaterThan(0);
	});

	it('PostGIS SQL dump から SQLite 互換 DB を作れる', async () => {
		const SQL = await initSqlJs({
			locateFile: () => wasmPath
		});
		const bytes = readFileSync(samplePath);
		const db = createDatabaseFromBytes(SQL, new Uint8Array(bytes));

		const tables = db.exec(
			"SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
		)[0]?.values.map((row) => row[0]);
		const count = db.exec('SELECT COUNT(*) FROM "ああああ"')[0]?.values[0]?.[0];
		const geometryColumns = db.exec(
			'SELECT f_table_name, f_geometry_column, geometry_type, srid, geometry_format FROM geometry_columns'
		)[0]?.values;
		const geometryBlob = db.exec(
			'SELECT "wkb_geometry" FROM "ああああ" LIMIT 1'
		)[0]?.values[0]?.[0];
		const geometry = parseGeometryBlob(geometryBlob as Uint8Array);

		expect(tables).toEqual(['geometry_columns', 'ああああ']);
		expect(typeof count).toBe('number');
		expect(Number(count)).toBeGreaterThan(0);
		expect(geometryColumns).toEqual([['ああああ', 'wkb_geometry', 1, 4326, 'EWKB']]);
		expect(geometry).toEqual({
			type: 'Point',
			coordinates: [-116.92333333333, 33.892333333333]
		});

		db.close();
	});
});
