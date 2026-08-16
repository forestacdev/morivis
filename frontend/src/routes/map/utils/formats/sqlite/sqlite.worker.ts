import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';

import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { FeatureProp } from '$routes/map/types/properties';
import type {
	TabularCellValue,
	TabularPreview,
	TabularRow
} from '$routes/map/utils/formats/tabular';
import { parseGeometryBlob } from './geometry';
import {
	getGeometryColumnsForTable,
	isExcludedSqliteTableName,
	parseGeometryColumnsRows,
	resolveSqliteColumnName
} from './schema';
import { createDatabaseFromBytes, isSupportedSqliteInput } from './sql-dump';

import type {
	SqliteGeoJsonResult,
	SqliteGeometryColumnInfo,
	SqliteTableInfo,
	SqliteTableRows
} from '.';

type WorkerRequest =
	| {
		id: number;
		type: 'open';
		data: Uint8Array;
		wasmUrl: string;
	}
	| {
		id: number;
		type: 'getTables';
	}
	| {
		id: number;
		type: 'getPreview';
		tableName: string;
		previewRowCount?: number;
	}
	| {
		id: number;
		type: 'getRows';
		tableName: string;
	}
	| {
		id: number;
		type: 'toGeoJson';
		tableName: string;
		geometryColumn: string;
	};

let sqlPromise: Promise<SqlJsStatic> | null = null;
let db: Database | null = null;

const getSql = (wasmUrl: string): Promise<SqlJsStatic> => {
	if (!sqlPromise) {
		sqlPromise = initSqlJs({
			locateFile: () => wasmUrl
		});
	}

	return sqlPromise;
};

const closeDb = () => {
	if (!db) return;
	db.close();
	db = null;
};

const getDb = (): Database => {
	if (!db) {
		throw new Error('SQLite database is not open');
	}

	return db;
};

const quoteIdentifier = (value: string): string => `"${value.replace(/"/g, '""')}"`;

const normalizePreviewValue = (value: TabularCellValue): TabularCellValue => {
	if (value instanceof Uint8Array) {
		return `[BLOB ${value.byteLength} bytes]`;
	}

	return value;
};

const toFeaturePropertyValue = (
	value: TabularCellValue
): string | number | boolean | undefined => {
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}

	if (value instanceof Uint8Array) {
		return `[BLOB ${value.byteLength} bytes]`;
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	return undefined;
};

const buildRows = (
	columns: string[],
	values: unknown[][],
	normalizeValue?: (value: TabularCellValue) => TabularCellValue
): TabularRow[] =>
	values.map((rowValues) => {
		const row: TabularRow = {};

		columns.forEach((column, index) => {
			const cellValue = (rowValues[index] ?? null) as TabularCellValue;
			row[column] = normalizeValue ? normalizeValue(cellValue) : cellValue;
		});

		return row;
	});

const getTableColumns = (database: Database, tableName: string): string[] => {
	const result = database.exec(`PRAGMA table_info(${quoteIdentifier(tableName)})`);
	const values = result[0]?.values ?? [];

	return values
		.map((row) => row[1])
		.filter((value): value is string => typeof value === 'string');
};

const hasTable = (database: Database, tableName: string): boolean => {
	const result = database.exec(
		`SELECT name FROM sqlite_master WHERE type = 'table' AND name = '${
			tableName.replace(/'/g, "''")
		}'`
	);
	return (result[0]?.values.length ?? 0) > 0;
};

const getGeometryColumnsMap = (
	database: Database
): Map<string, SqliteGeometryColumnInfo[]> => {
	const geometryColumnsMap = new Map<string, SqliteGeometryColumnInfo[]>();
	if (!hasTable(database, 'geometry_columns')) return geometryColumnsMap;

	try {
		const columnNames = getTableColumns(database, 'geometry_columns');
		const result = database.exec(`SELECT * FROM ${quoteIdentifier('geometry_columns')}`);
		return parseGeometryColumnsRows(columnNames, result[0]?.values ?? []);
	} catch {
		return geometryColumnsMap;
	}

	return geometryColumnsMap;
};

const getTableRowCount = (database: Database, tableName: string): number | null => {
	try {
		const result = database.exec(`SELECT COUNT(*) FROM ${quoteIdentifier(tableName)}`);
		const value = result[0]?.values[0]?.[0];

		if (typeof value === 'number') return value;
		if (typeof value === 'string') {
			const numericValue = Number(value);
			return Number.isFinite(numericValue) ? numericValue : null;
		}

		return null;
	} catch {
		return null;
	}
};

const getTables = (database: Database): SqliteTableInfo[] => {
	const result = database.exec(
		"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
	);
	const values = result[0]?.values ?? [];
	const geometryColumnsMap = getGeometryColumnsMap(database);

	return values
		.map((row) => row[0])
		.filter((value): value is string => typeof value === 'string')
		.filter((name) => !isExcludedSqliteTableName(name))
		.map((name) => {
			const columns = getTableColumns(database, name);

			return {
				name,
				columns,
				rowCount: getTableRowCount(database, name),
				geometryColumns: getGeometryColumnsForTable(geometryColumnsMap, name).map((
					column
				) => ({
					...column,
					columnName: resolveSqliteColumnName(columns, column.columnName)
						?? column.columnName
				}))
			};
		});
};

const queryTableRows = (database: Database, tableName: string, limit?: number): SqliteTableRows => {
	const safeLimit = typeof limit === 'number' ? Math.max(1, Math.floor(limit)) : null;
	const sql = safeLimit
		? `SELECT * FROM ${quoteIdentifier(tableName)} LIMIT ${safeLimit}`
		: `SELECT * FROM ${quoteIdentifier(tableName)}`;
	const result = database.exec(sql);
	const firstResult = result[0];

	if (!firstResult) {
		return {
			headers: getTableColumns(database, tableName),
			rows: []
		};
	}

	return {
		headers: firstResult.columns,
		rows: buildRows(firstResult.columns, firstResult.values)
	};
};

const getPreview = (
	database: Database,
	tableName: string,
	previewRowCount?: number
): TabularPreview => {
	const result = queryTableRows(database, tableName, previewRowCount);

	return {
		headers: result.headers,
		rows: result.rows.map((row) => {
			const normalizedRow: TabularRow = {};

			for (const [key, value] of Object.entries(row)) {
				normalizedRow[key] = normalizePreviewValue(value);
			}

			return normalizedRow;
		})
	};
};

const toGeoJson = (
	database: Database,
	tableName: string,
	geometryColumn: string
): SqliteGeoJsonResult => {
	const result = queryTableRows(database, tableName);
	const resolvedGeometryColumn = resolveSqliteColumnName(result.headers, geometryColumn)
		?? geometryColumn;

	if (!result.headers.includes(resolvedGeometryColumn)) {
		throw new Error(`Geometry column '${geometryColumn}' not found`);
	}

	const features: Feature<any>[] = [];

	for (const row of result.rows) {
		const geometry = parseGeometryBlob(row[resolvedGeometryColumn]);
		if (!geometry) continue;

		const properties: FeatureProp = {};
		for (const [key, value] of Object.entries(row)) {
			if (key === resolvedGeometryColumn) continue;
			const normalizedValue = toFeaturePropertyValue(value);
			if (normalizedValue !== undefined) {
				properties[key] = normalizedValue;
			}
		}

		features.push({
			type: 'Feature',
			properties,
			geometry
		});
	}

	if (features.length === 0) {
		throw new Error('Geometry を読み取れるフィーチャーが見つかりませんでした');
	}

	const geojson: FeatureCollection<any> = {
		type: 'FeatureCollection',
		features
	};

	return { geojson };
};

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
	void (async () => {
		const message = event.data;

		try {
			if (message.type === 'open') {
				const SQL = await getSql(message.wasmUrl);
				closeDb();
				if (!isSupportedSqliteInput(message.data)) {
					throw new Error('対応していない SQLite / SQL ダンプ形式です');
				}
				db = createDatabaseFromBytes(SQL, message.data);
				self.postMessage({ id: message.id, result: true });
				return;
			}

			const database = getDb();

			if (message.type === 'getTables') {
				self.postMessage({ id: message.id, result: getTables(database) });
				return;
			}

			if (message.type === 'getPreview') {
				self.postMessage({
					id: message.id,
					result: getPreview(database, message.tableName, message.previewRowCount)
				});
				return;
			}

			if (message.type === 'getRows') {
				self.postMessage({
					id: message.id,
					result: queryTableRows(database, message.tableName)
				});
				return;
			}

			if (message.type === 'toGeoJson') {
				self.postMessage({
					id: message.id,
					result: toGeoJson(database, message.tableName, message.geometryColumn)
				});
			}
		} catch (error) {
			self.postMessage({
				id: message.id,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	})();
});
