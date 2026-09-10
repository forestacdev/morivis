import initSqlJs from 'sql.js';
import { describe, expect, it } from 'vitest';

import { parseGeometryBlob } from './geometry';
import { createDatabaseFromBytes, parseSqlDump } from './sql-dump';

const wasmPath = new URL('../../../../../../static/sql-wasm.wasm', import.meta.url).pathname;
const testTableName = 'test_points';
const testEwkb = '0101000020E6100000000000000000F03F0000000000000040';
const postgisSqlDump = String.raw`
SET standard_conforming_strings = ON;
DROP TABLE IF EXISTS "test_schema"."test_points" CASCADE;
BEGIN;
CREATE TABLE "test_schema"."test_points"();
ALTER TABLE "test_schema"."test_points" ADD COLUMN "test_id" SERIAL PRIMARY KEY;
SELECT AddGeometryColumn('test_schema','test_points','test_geometry',4326,'POINT',2);
ALTER TABLE "test_schema"."test_points" ADD COLUMN "test_label" VARCHAR;
INSERT INTO "test_schema"."test_points" ("test_id", "test_geometry", "test_label")
VALUES (1, '${testEwkb}', 'test-label');
COMMIT;
`;

describe('sql dump parser', () => {
	it('PostGIS SQL dump をテーブル定義として読める', () => {
		const tables = parseSqlDump(postgisSqlDump);

		expect(tables).toHaveLength(1);
		expect(tables[0]?.name).toBe(testTableName);
		expect(tables[0]?.geometryColumns).toEqual([
			{
				columnName: 'test_geometry',
				srid: 4326,
				geometryType: 'POINT',
				coordDimension: 2
			}
		]);
		expect(tables[0]?.rows).toHaveLength(1);
	});

	it('PostGIS SQL dump から SQLite 互換 DB を作れる', async () => {
		const SQL = await initSqlJs({ locateFile: () => wasmPath });
		const db = createDatabaseFromBytes(SQL, new TextEncoder().encode(postgisSqlDump));
		const tables = db.exec(
			"SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
		)[0]?.values.map((row) => row[0]);
		const count = db.exec(`SELECT COUNT(*) FROM "${testTableName}"`)[0]?.values[0]?.[0];
		const geometryColumns = db.exec(
			'SELECT f_table_name, f_geometry_column, geometry_type, srid, geometry_format FROM geometry_columns'
		)[0]?.values;
		const geometryBlob = db.exec(`SELECT "test_geometry" FROM "${testTableName}" LIMIT 1`)[0]
			?.values[0]?.[0];

		expect(tables).toEqual(['geometry_columns', testTableName]);
		expect(count).toBe(1);
		expect(geometryColumns).toEqual([[testTableName, 'test_geometry', 1, 4326, 'EWKB']]);
		expect(parseGeometryBlob(geometryBlob as Uint8Array)).toEqual({
			type: 'Point',
			coordinates: [1, 2]
		});
		db.close();
	});

	it('CREATE TABLE のない INSERT-only dump から列を推定する', () => {
		const tables = parseSqlDump(String.raw`
			-- バックアップツールが INSERT 文だけを出力したケース
			INSERT INTO test_schema.test_observations
				(test_id, latitude, longitude, score, active, test_note)
			VALUES
				(1, 2.5, 3.5, 4::numeric, true, 'test-a'::text),
				(2, 5, 6, NULL::numeric, false, E'test\nline');
		`);

		expect(tables[0]?.columns.map(({ name, type }) => [name, type])).toEqual([
			['test_id', 'INTEGER'],
			['latitude', 'REAL'],
			['longitude', 'REAL'],
			['score', 'INTEGER'],
			['active', 'INTEGER'],
			['test_note', 'TEXT']
		]);
		expect(tables[0]?.rows).toEqual([
			{ test_id: 1, latitude: 2.5, longitude: 3.5, score: 4, active: 1, test_note: 'test-a' },
			{
				test_id: 2,
				latitude: 5,
				longitude: 6,
				score: null,
				active: 0,
				test_note: 'test\nline'
			}
		]);
	});

	it('列名なし INSERT は CREATE TABLE の列順で読める', () => {
		const tables = parseSqlDump(`
			CREATE TABLE IF NOT EXISTS test_values (
				test_id INTEGER PRIMARY KEY,
				test_label TEXT
			);
			INSERT INTO test_values VALUES (1, 'test-a'), (2, 'test-b');
		`);

		expect(tables[0]?.rows).toEqual([
			{ test_id: 1, test_label: 'test-a' },
			{ test_id: 2, test_label: 'test-b' }
		]);
	});

	it('PostgreSQL COPY FROM stdin を読める', () => {
		const tables = parseSqlDump(String.raw`
			COPY test_schema.test_copy (test_id, latitude, longitude, test_label) FROM stdin;
			1	2.5	3.5	test-a
			2	\N	4.5	test\tlabel
			\.
		`);

		expect(tables[0]?.columns.map(({ name, type }) => [name, type])).toEqual([
			['test_id', 'INTEGER'],
			['latitude', 'REAL'],
			['longitude', 'REAL'],
			['test_label', 'TEXT']
		]);
		expect(tables[0]?.rows).toEqual([
			{ test_id: 1, latitude: 2.5, longitude: 3.5, test_label: 'test-a' },
			{ test_id: 2, latitude: null, longitude: 4.5, test_label: 'test\tlabel' }
		]);
	});

	it('PostGIS 関数と geometry cast の EWKB を geometry として復元する', () => {
		const tables = parseSqlDump(`
			INSERT INTO test_geometry_values (test_id, test_geometry) VALUES
				(1, ST_GeomFromEWKB('\\x${testEwkb}')),
				(2, '${testEwkb}'::geometry);
		`);

		expect(tables[0]?.columns.find((column) => column.name === 'test_geometry')?.isGeometry)
			.toBe(true);
		expect(tables[0]?.rows[0]?.test_geometry).toBeInstanceOf(Uint8Array);
		expect(tables[0]?.rows[1]?.test_geometry).toBeInstanceOf(Uint8Array);
	});

	it('EWKT 文字列の Geometry を SQLite 経由で復元する', async () => {
		const SQL = await initSqlJs({ locateFile: () => wasmPath });
		const sql = `
			INSERT INTO test_ewkt (test_id, test_geometry)
			VALUES (1, 'SRID=3857;POINT (1 2)'::geometry);
		`;
		const db = createDatabaseFromBytes(SQL, new TextEncoder().encode(sql));
		const geometryValue = db.exec('SELECT test_geometry FROM test_ewkt')[0]?.values[0]?.[0];
		const geometryMetadata = db.exec(
			"SELECT srid, geometry_format FROM geometry_columns WHERE f_table_name = 'test_ewkt'"
		)[0]?.values[0];

		expect(geometryMetadata).toEqual([3857, 'WKT']);
		expect(parseGeometryBlob(geometryValue as string)).toEqual({
			type: 'Point',
			coordinates: [1, 2]
		});
		db.close();
	});

	it('geometry 型宣言から Geometry 種別とSRIDを取得する', () => {
		const tables = parseSqlDump(`
			CREATE TABLE test_declared_geometry (
				test_id INTEGER,
				test_geometry geometry(Point, 3857)
			);
			INSERT INTO test_declared_geometry VALUES (1, 'SRID=3857;POINT (1 2)');
		`);

		expect(tables[0]?.geometryColumns).toEqual([{
			columnName: 'test_geometry',
			srid: 3857,
			geometryType: 'POINT',
			coordDimension: 2
		}]);
	});

	it('実行対象の SQL は無視し、INSERT の値だけを再構築する', async () => {
		const SQL = await initSqlJs({ locateFile: () => wasmPath });
		const sql = `
			CREATE TABLE test_safe (test_id INTEGER, test_label TEXT);
			ATTACH DATABASE '/tmp/test-unsafe.db' AS external_database;
			CREATE TRIGGER test_trigger AFTER INSERT ON test_safe BEGIN DELETE FROM test_safe; END;
			INSERT INTO test_safe VALUES (1, 'test-kept');
		`;
		const db = createDatabaseFromBytes(SQL, new TextEncoder().encode(sql));

		expect(db.exec('SELECT test_id, test_label FROM test_safe')[0]?.values)
			.toEqual([[1, 'test-kept']]);
		expect(db.exec("SELECT name FROM sqlite_master WHERE type = 'trigger'")).toEqual([]);
		db.close();
	});
});
