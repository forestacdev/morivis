import initSqlJs from 'sql.js';
import { describe, expect, it } from 'vitest';

import { parseGeometryBlob } from './geometry';
import { createDatabaseFromBytes, parseSqlDump } from './sql-dump';

const wasmPath = new URL('../../../../../../static/sql-wasm.wasm', import.meta.url).pathname;
const japaneseTableName = '日本語テーブル';
const sampleSqlDump = String.raw`
SET standard_conforming_strings = ON;
DROP TABLE IF EXISTS "public"."日本語テーブル" CASCADE;
BEGIN;
CREATE TABLE "public"."日本語テーブル"();
ALTER TABLE "public"."日本語テーブル" ADD COLUMN "ogc_fid" SERIAL CONSTRAINT "日本語テーブル_pk" PRIMARY KEY;
SELECT AddGeometryColumn('public','日本語テーブル','wkb_geometry',4326,'POINT',2);
ALTER TABLE "public"."日本語テーブル" ADD COLUMN "id" VARCHAR;
ALTER TABLE "public"."日本語テーブル" ADD COLUMN "title" VARCHAR;
INSERT INTO "public"."日本語テーブル" ("ogc_fid", "wkb_geometry", "id", "title") VALUES (1, '0101000020E6100000617DB1E4173B5DC0E0E589FA37F24040', 'urn:earthquake-usgs-gov:ci:40673106', 'M 0.2 - 6 km SW of Banning, CA');
COMMIT;
`;

describe('sql dump parser', () => {
	it('PostGIS SQL dump をテーブル定義として読める', () => {
		const tables = parseSqlDump(sampleSqlDump);

		expect(tables).toHaveLength(1);
		expect(tables[0]?.name).toBe(japaneseTableName);
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
		const bytes = new TextEncoder().encode(sampleSqlDump);
		const db = createDatabaseFromBytes(SQL, bytes);

		const tables = db.exec(
			"SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
		)[0]?.values.map((row) => row[0]);
		const count = db.exec(`SELECT COUNT(*) FROM "${japaneseTableName}"`)[0]?.values[0]?.[0];
		const geometryColumns = db.exec(
			'SELECT f_table_name, f_geometry_column, geometry_type, srid, geometry_format FROM geometry_columns'
		)[0]?.values;
		const geometryBlob = db.exec(`SELECT "wkb_geometry" FROM "${japaneseTableName}" LIMIT 1`)[0]
			?.values[0]?.[0];
		const geometry = parseGeometryBlob(geometryBlob as Uint8Array);

		expect(tables).toEqual(['geometry_columns', japaneseTableName]);
		expect(typeof count).toBe('number');
		expect(Number(count)).toBeGreaterThan(0);
		expect(geometryColumns).toEqual([[japaneseTableName, 'wkb_geometry', 1, 4326, 'EWKB']]);
		expect(geometry).toEqual({
			type: 'Point',
			coordinates: [-116.92333333333, 33.892333333333]
		});

		db.close();
	});
});
