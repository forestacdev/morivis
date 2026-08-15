import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';

import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { FeatureProp } from '$routes/map/types/properties';
import type {
	TabularCellValue,
	TabularPreview,
	TabularRow
} from '$routes/map/utils/formats/tabular';

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
const EXCLUDED_TABLE_NAMES = new Set(['geometry_columns', 'spatial_ref_sys']);

const parseGpkgBinary = (buf: Uint8Array): any | null => {
	if (buf.length < 8) return null;
	if (buf[0] !== 0x47 || buf[1] !== 0x50) return null;

	const flags = buf[3];
	const envelopeType = (flags >> 1) & 0x07;
	const envelopeSizes = [0, 32, 48, 48, 64];
	const envelopeSize = envelopeSizes[envelopeType] ?? 0;

	const wkbOffset = 8 + envelopeSize;
	if (wkbOffset >= buf.length) return null;

	return parseWkb(buf.subarray(wkbOffset));
};

const parseWkb = (buf: Uint8Array): any | null => {
	if (buf.length < 5) return null;

	const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	const le = buf[0] === 1;
	const wkbType = le ? dv.getUint32(1, true) : dv.getUint32(1, false);
	const baseType = wkbType % 1000;
	let offset = 5;

	const readDouble = (): number => {
		const value = le ? dv.getFloat64(offset, true) : dv.getFloat64(offset, false);
		offset += 8;
		return value;
	};

	const readUint32 = (): number => {
		const value = le ? dv.getUint32(offset, true) : dv.getUint32(offset, false);
		offset += 4;
		return value;
	};

	const hasZ = (wkbType >= 1000 && wkbType < 2000) || wkbType >= 3000;
	const hasM = (wkbType >= 2000 && wkbType < 3000) || wkbType >= 3000;
	const coordSize = 2 + (hasZ ? 1 : 0) + (hasM ? 1 : 0);

	const readCoord = (): [number, number] => {
		const x = readDouble();
		const y = readDouble();
		for (let index = 2; index < coordSize; index += 1) readDouble();
		return [x, y];
	};

	const readLinearRing = (): [number, number][] => {
		const count = readUint32();
		const coords: [number, number][] = [];
		for (let index = 0; index < count; index += 1) coords.push(readCoord());
		return coords;
	};

	switch (baseType) {
		case 1:
			return { type: 'Point', coordinates: readCoord() };
		case 2: {
			const count = readUint32();
			const coords: [number, number][] = [];
			for (let index = 0; index < count; index += 1) coords.push(readCoord());
			return { type: 'LineString', coordinates: coords };
		}
		case 3: {
			const count = readUint32();
			const rings: [number, number][][] = [];
			for (let index = 0; index < count; index += 1) rings.push(readLinearRing());
			return { type: 'Polygon', coordinates: rings };
		}
		case 4: {
			const count = readUint32();
			const points: [number, number][] = [];
			for (let index = 0; index < count; index += 1) {
				const child = parseWkb(buf.subarray(offset));
				if (child) points.push(child.coordinates);
				offset += 5 + coordSize * 8;
			}
			return { type: 'MultiPoint', coordinates: points };
		}
		case 5: {
			const count = readUint32();
			const lines: [number, number][][] = [];
			for (let index = 0; index < count; index += 1) {
				const child = parseWkb(buf.subarray(offset));
				if (child) lines.push(child.coordinates);
				const childBuffer = buf.subarray(offset);
				const childView = new DataView(
					childBuffer.buffer,
					childBuffer.byteOffset,
					childBuffer.byteLength
				);
				const childLe = childBuffer[0] === 1;
				const pointCount = childLe
					? childView.getUint32(5, true)
					: childView.getUint32(5, false);
				offset += 5 + 4 + pointCount * coordSize * 8;
			}
			return { type: 'MultiLineString', coordinates: lines };
		}
		case 6: {
			const count = readUint32();
			const polygons: [number, number][][][] = [];
			for (let index = 0; index < count; index += 1) {
				const start = offset;
				const child = parseWkb(buf.subarray(offset));
				if (child) polygons.push(child.coordinates);
				const childBuffer = buf.subarray(start);
				const childView = new DataView(
					childBuffer.buffer,
					childBuffer.byteOffset,
					childBuffer.byteLength
				);
				const childLe = childBuffer[0] === 1;
				let childOffset = 5;
				const ringCount = childLe
					? childView.getUint32(childOffset, true)
					: childView.getUint32(childOffset, false);
				childOffset += 4;
				for (let ringIndex = 0; ringIndex < ringCount; ringIndex += 1) {
					const pointCount = childLe
						? childView.getUint32(childOffset, true)
						: childView.getUint32(childOffset, false);
					childOffset += 4 + pointCount * coordSize * 8;
				}
				offset = start + childOffset;
			}
			return { type: 'MultiPolygon', coordinates: polygons };
		}
		default:
			return null;
	}
};

const parseGeometryBlob = (value: TabularCellValue): any | null => {
	if (!(value instanceof Uint8Array)) return null;
	return parseGpkgBinary(value) ?? parseWkb(value);
};

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
		`SELECT name FROM sqlite_master WHERE type = 'table' AND name = '${tableName.replace(/'/g, "''")}'`
	);
	return (result[0]?.values.length ?? 0) > 0;
};

const getGeometryColumnsMap = (
	database: Database
): Map<string, SqliteGeometryColumnInfo[]> => {
	const geometryColumnsMap = new Map<string, SqliteGeometryColumnInfo[]>();
	if (!hasTable(database, 'geometry_columns')) return geometryColumnsMap;

	try {
		const result = database.exec(
			'SELECT f_table_name, f_geometry_column, geometry_type, srid, geometry_format FROM geometry_columns'
		);
		const values = result[0]?.values ?? [];

		for (const row of values) {
			const tableName = row[0];
			const columnName = row[1];
			if (typeof tableName !== 'string' || typeof columnName !== 'string') continue;

			const info: SqliteGeometryColumnInfo = {
				columnName,
				geometryType: typeof row[2] === 'number' ? row[2] : Number(row[2] ?? NaN) || null,
				srid: typeof row[3] === 'number' ? row[3] : Number(row[3] ?? NaN) || null,
				geometryFormat: typeof row[4] === 'string' ? row[4] : null
			};

			const current = geometryColumnsMap.get(tableName) ?? [];
			current.push(info);
			geometryColumnsMap.set(tableName, current);
		}
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
		.filter((name) => !EXCLUDED_TABLE_NAMES.has(name))
		.map((name) => ({
			name,
			columns: getTableColumns(database, name),
			rowCount: getTableRowCount(database, name),
			geometryColumns: geometryColumnsMap.get(name) ?? []
		}));
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

const getPreview = (database: Database, tableName: string, previewRowCount?: number): TabularPreview => {
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
	if (!result.headers.includes(geometryColumn)) {
		throw new Error(`Geometry column '${geometryColumn}' not found`);
	}

	const features: Feature[] = [];

	for (const row of result.rows) {
		const geometry = parseGeometryBlob(row[geometryColumn]);
		if (!geometry) continue;

		const properties: FeatureProp = {};
		for (const [key, value] of Object.entries(row)) {
			if (key === geometryColumn) continue;
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

	const geojson: FeatureCollection = {
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
				db = new SQL.Database(message.data);
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
