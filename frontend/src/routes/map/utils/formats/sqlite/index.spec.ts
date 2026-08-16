import initSqlJs, { type Database } from 'sql.js';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const wasmPath = new URL('../../../../../../static/sql-wasm.wasm', import.meta.url).pathname;

vi.mock('$routes/map/utils/platform/asset-path', () => ({
	resolveStaticAssetPath: (path: string) => {
		if (path === '/sql-wasm.wasm') {
			return `file://${wasmPath}`;
		}
		return path;
	}
}));

import {
	closeSqlite,
	getSqlitePreview,
	getSqliteTableGeoJson,
	getSqliteTableRows,
	getSqliteTables,
	openSqlite
} from '.';

let sqliteBytes: Uint8Array;

const parseWkbPoint = (value: Uint8Array) => {
	const view = new DataView(value.buffer, value.byteOffset, value.byteLength);
	return {
		type: 'Point' as const,
		coordinates: [view.getFloat64(5, true), view.getFloat64(13, true)] as [number, number]
	};
};

class MockSqliteWorker {
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: ((event: ErrorEvent) => void) | null = null;
	private db: Database | null = null;
	private sqlPromise: ReturnType<typeof initSqlJs> | null = null;

	private emit = (result: Record<string, unknown>) => {
		this.onmessage?.({ data: result } as MessageEvent);
	};

	private getSql = async (wasmUrl: string) => {
		if (!this.sqlPromise) {
			this.sqlPromise = initSqlJs({
				locateFile: () => wasmUrl.replace(/^file:\/\//, '')
			});
		}
		return this.sqlPromise;
	};

	private getGeometryColumnsMap = () => {
		if (!this.db) throw new Error('DB not open');
		const map = new Map<
			string,
			{
				columnName: string;
				geometryType: number | null;
				srid: number | null;
				geometryFormat: string | null;
			}[]
		>();
		const result = this.db.exec(
			'SELECT f_table_name, f_geometry_column, geometry_type, srid, geometry_format FROM geometry_columns'
		);

		for (const row of result[0]?.values ?? []) {
			const tableName = String(row[0]);
			const current = map.get(tableName) ?? [];
			current.push({
				columnName: String(row[1]),
				geometryType: Number(row[2]),
				srid: Number(row[3]),
				geometryFormat: String(row[4])
			});
			map.set(tableName, current);
		}

		return map;
	};

	private getTables = () => {
		if (!this.db) throw new Error('DB not open');
		const names = this.db.exec(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
		);
		const geometryColumnsMap = this.getGeometryColumnsMap();

		return (names[0]?.values ?? [])
			.map((row) => String(row[0]))
			.filter((name) => !['geometry_columns', 'spatial_ref_sys'].includes(name))
			.map((tableName) => {
				const columns = this.db?.exec(`PRAGMA table_info("${tableName}")`)[0]?.values ?? [];
				const count =
					this.db?.exec(`SELECT COUNT(*) FROM "${tableName}"`)[0]?.values[0]?.[0] ?? null;

				return {
					name: tableName,
					columns: columns.map((column) => String(column[1])),
					rowCount: typeof count === 'number' ? count : Number(count),
					geometryColumns: geometryColumnsMap.get(tableName) ?? []
				};
			});
	};

	postMessage(message: Record<string, unknown>) {
		(async () => {
			try {
				const id = Number(message.id);
				const type = String(message.type);

				if (type === 'open') {
					const SQL = await this.getSql(String(message.wasmUrl));
					this.db?.close();
					this.db = new SQL.Database(message.data as Uint8Array);
					this.emit({ id, result: true });
					return;
				}

				if (!this.db) throw new Error('DB not open');

				if (type === 'getTables') {
					this.emit({ id, result: this.getTables() });
					return;
				}

				if (type === 'getPreview') {
					const tableName = String(message.tableName);
					const limit = Number(message.previewRowCount ?? 5);
					const result = this.db.exec(`SELECT * FROM "${tableName}" LIMIT ${limit}`);
					const columns = result[0]?.columns ?? [];
					const rows = (result[0]?.values ?? []).map((values) =>
						Object.fromEntries(
							columns.map((column, index) => {
								const value = values[index];
								return [
									column,
									value instanceof Uint8Array
										? `[BLOB ${value.byteLength} bytes]`
										: (value ?? null)
								];
							})
						)
					);

					this.emit({
						id,
						result: {
							headers: columns,
							rows
						}
					});
					return;
				}

				if (type === 'getRows') {
					const tableName = String(message.tableName);
					const result = this.db.exec(`SELECT * FROM "${tableName}"`);
					const columns = result[0]?.columns ?? [];
					const rows = (result[0]?.values ?? []).map((values) =>
						Object.fromEntries(
							columns.map((column, index) => [column, values[index] ?? null])
						)
					);

					this.emit({
						id,
						result: {
							headers: columns,
							rows
						}
					});
					return;
				}

				if (type === 'toGeoJson') {
					const tableName = String(message.tableName);
					const geometryColumn = String(message.geometryColumn);
					const result = this.db.exec(`SELECT * FROM "${tableName}"`);
					const columns = result[0]?.columns ?? [];
					const geometryIndex = columns.indexOf(geometryColumn);
					const features = (result[0]?.values ?? []).flatMap((values) => {
						const geometryValue = values[geometryIndex];
						if (!(geometryValue instanceof Uint8Array)) return [];

						return [
							{
								type: 'Feature',
								properties: Object.fromEntries(
									columns
										.filter((column) => column !== geometryColumn)
										.map((column, index) => {
											const valueIndex = columns.indexOf(column);
											return [column, values[valueIndex] ?? null];
										})
								),
								geometry: parseWkbPoint(geometryValue)
							}
						];
					});

					this.emit({
						id,
						result: {
							geojson: {
								type: 'FeatureCollection',
								features
							}
						}
					});
					return;
				}

				this.emit({ id, error: `Unsupported command: ${type}` });
			} catch (error) {
				this.emit({
					id: Number(message.id),
					error: error instanceof Error ? error.message : String(error)
				});
			}
		})().catch((error) => {
			this.onerror?.(
				{ message: error instanceof Error ? error.message : String(error) } as ErrorEvent
			);
		});
	}

	terminate() {
		this.db?.close();
		this.db = null;
	}
}

beforeAll(async () => {
	const SQL = await initSqlJs({
		locateFile: () => wasmPath
	});
	const db = new SQL.Database();

	db.run(`
		CREATE TABLE geometry_columns (
			f_table_name VARCHAR,
			f_geometry_column VARCHAR,
			geometry_type INTEGER,
			coord_dimension INTEGER,
			srid INTEGER,
			geometry_format VARCHAR
		);
		CREATE TABLE spatial_ref_sys (
			srid INTEGER UNIQUE,
			auth_name TEXT,
			auth_srid TEXT,
			srtext TEXT
		);
		CREATE TABLE points (
			id INTEGER PRIMARY KEY,
			name TEXT,
			lat REAL,
			lon REAL,
			photo BLOB
		);
		CREATE TABLE all_day__georss (
			ogc_fid INTEGER PRIMARY KEY AUTOINCREMENT,
			GEOMETRY BLOB,
			id VARCHAR,
			title VARCHAR,
			updated TIMESTAMP
		);
		INSERT INTO points (name, lat, lon, photo) VALUES
			('alpha', 35.6895, 139.6917, x'01020304'),
			('beta', 34.6937, 135.5023, NULL);
		INSERT INTO geometry_columns (
			f_table_name,
			f_geometry_column,
			geometry_type,
			coord_dimension,
			srid,
			geometry_format
		) VALUES (
			'all_day__georss',
			'GEOMETRY',
			1,
			2,
			4326,
			'WKB'
		);
		INSERT INTO spatial_ref_sys (srid, auth_name, auth_srid, srtext) VALUES
			(4326, 'EPSG', '4326', 'WGS 84');
		INSERT INTO all_day__georss (GEOMETRY, id, title, updated) VALUES
			(
				x'0101000000617DB1E4173B5DC0E0E589FA37F24040',
				'urn:earthquake-usgs-gov:ci:40673106',
				'M 0.2 - 6 km SW of Banning, CA',
				'2026-08-15T10:51:48.511Z'
			);
	`);

	sqliteBytes = db.export();
	db.close();
});

beforeEach(() => {
	vi.stubGlobal('Worker', MockSqliteWorker as unknown as typeof Worker);
});

afterEach(() => {
	closeSqlite();
	vi.unstubAllGlobals();
});

describe('sqlite parser', () => {
	it('SQLite fixture からテーブル一覧とプレビューを取得できる', async () => {
		await openSqlite(new Uint8Array(sqliteBytes));

		const tables = await getSqliteTables();
		const preview = await getSqlitePreview();

		expect(tables).toHaveLength(2);
		expect(tables[0]?.name).toBe('all_day__georss');
		expect(tables[0]?.geometryColumns).toEqual([
			{
				columnName: 'GEOMETRY',
				geometryType: 1,
				srid: 4326,
				geometryFormat: 'WKB'
			}
		]);
		expect(tables[1]?.name).toBe('points');
		expect(tables[1]?.columns).toEqual(['id', 'name', 'lat', 'lon', 'photo']);
		expect(preview.activeTable).toBe('all_day__georss');
		expect(preview.headers).toEqual(['ogc_fid', 'GEOMETRY', 'id', 'title', 'updated']);
		expect(preview.rows[0]?.GEOMETRY).toBe('[BLOB 21 bytes]');
	});

	it('座標列テーブルから全行を取得できる', async () => {
		await openSqlite(new Uint8Array(sqliteBytes));

		const rows = await getSqliteTableRows('points');

		expect(rows.headers).toEqual(['id', 'name', 'lat', 'lon', 'photo']);
		expect(rows.rows).toHaveLength(2);
		expect(rows.rows[0]?.name).toBe('alpha');
		expect(rows.rows[0]?.lat).toBe(35.6895);
		expect(rows.rows[0]?.lon).toBe(139.6917);
		expect(rows.rows[0]?.photo).toBeInstanceOf(Uint8Array);
	});

	it('WKB ジオメトリ列テーブルを GeoJSON に変換できる', async () => {
		await openSqlite(new Uint8Array(sqliteBytes));

		const result = await getSqliteTableGeoJson('all_day__georss', 'GEOMETRY');

		expect(result.geojson.features).toHaveLength(1);
		expect(result.geojson.features[0]?.geometry).toEqual({
			type: 'Point',
			coordinates: [-116.92333333333, 33.892333333333]
		});
		expect(result.geojson.features[0]?.properties?.title).toBe(
			'M 0.2 - 6 km SW of Banning, CA'
		);
		expect(result.geojson.features[0]?.properties?.id).toBe(
			'urn:earthquake-usgs-gov:ci:40673106'
		);
	});
});
