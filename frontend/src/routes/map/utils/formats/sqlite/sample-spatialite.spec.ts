import initSqlJs from 'sql.js';
import { describe, expect, it } from 'vitest';

import { parseGeometryBlob } from './geometry';
import { getGeometryColumnsForTable, parseGeometryColumnsRows } from './schema';

const wasmPath = new URL('../../../../../../static/sql-wasm.wasm', import.meta.url).pathname;
const createClassicSpatiaLitePointBlob = (
	x: number,
	y: number,
	srid = 4326
): Uint8Array => {
	const bytes = new Uint8Array(60);
	const view = new DataView(bytes.buffer);

	bytes[0] = 0x00;
	bytes[1] = 0x01;
	view.setUint32(2, srid, true);
	view.setFloat64(6, x, true);
	view.setFloat64(14, y, true);
	view.setFloat64(22, x, true);
	view.setFloat64(30, y, true);
	bytes[38] = 0x7c;
	view.setUint32(39, 1, true);
	view.setFloat64(43, x, true);
	view.setFloat64(51, y, true);
	bytes[59] = 0xfe;

	return bytes;
};

describe('sample spatialite fixture', () => {
	it('in-memory SpatiaLite fixture の geometry metadata と geometry blob を読める', async () => {
		const SQL = await initSqlJs({
			locateFile: () => wasmPath
		});
		const db = new SQL.Database();
		db.run(`
			CREATE TABLE geometry_columns (
				f_table_name TEXT,
				f_geometry_column TEXT,
				geometry_type INTEGER,
				srid INTEGER,
				geometry_format TEXT
			);
			CREATE TABLE "all_day__georss" (
				"geometry" BLOB
			);
		`);
		db.run(
			`INSERT INTO geometry_columns (
				f_table_name,
				f_geometry_column,
				geometry_type,
				srid,
				geometry_format
			) VALUES (?, ?, ?, ?, ?)`,
			['all_day__georss', 'geometry', 1, 4326, 'SpatiaLite']
		);
		db.run(`INSERT INTO "all_day__georss" ("geometry") VALUES (?)`, [
			createClassicSpatiaLitePointBlob(-116.92333333333, 33.892333333333)
		]);

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
