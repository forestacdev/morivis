import type { SqliteGeometryColumnInfo } from '.';

type GeometryTypeCodeSource = {
	geometryTypeValue: unknown;
	typeValue: unknown;
	coordDimensionValue: unknown;
};

const EXCLUDED_TABLE_NAMES = new Set([
	'data_licenses',
	'elementarygeometries',
	'geometry_columns',
	'geometry_columns_auth',
	'geometry_columns_field_infos',
	'geometry_columns_statistics',
	'geometry_columns_time',
	'knn2',
	'spatial_ref_sys',
	'spatial_ref_sys_aux',
	'spatialindex',
	'spatialite_history',
	'sql_statements_log',
	'vector_layers',
	'vector_layers_auth',
	'vector_layers_field_infos',
	'vector_layers_statistics',
	'views_geometry_columns',
	'views_geometry_columns_auth',
	'views_geometry_columns_field_infos',
	'views_geometry_columns_statistics',
	'virts_geometry_columns',
	'virts_geometry_columns_auth',
	'virts_geometry_columns_field_infos',
	'virts_geometry_columns_statistics'
]);

const EXCLUDED_TABLE_PREFIXES = ['idx_', 'sqlite_'];

const normalizeGeometryTypeName = (value: string): string =>
	value.toUpperCase().replace(/\s+/g, '');

const BASE_GEOMETRY_TYPE_CODE_BY_NAME: Record<string, number> = {
	POINT: 1,
	LINESTRING: 2,
	POLYGON: 3,
	MULTIPOINT: 4,
	MULTILINESTRING: 5,
	MULTIPOLYGON: 6,
	GEOMETRYCOLLECTION: 7
};

const toFiniteNumber = (value: unknown): number | null => {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim().length > 0) {
		const numericValue = Number(value);
		return Number.isFinite(numericValue) ? numericValue : null;
	}

	return null;
};

const toGeometryTypeOffset = (coordDimensionValue: unknown): number => {
	if (typeof coordDimensionValue === 'string') {
		const normalized = coordDimensionValue.trim().toUpperCase();
		if (normalized === 'XY') return 0;
		if (normalized === 'XYZ') return 1000;
		if (normalized === 'XYM') return 2000;
		if (normalized === 'XYZM') return 3000;
	}

	const numericValue = toFiniteNumber(coordDimensionValue);
	if (numericValue === 2) return 0;
	if (numericValue === 4) return 3000;
	if (numericValue === 3) return 1000;

	return 0;
};

const toGeometryTypeCode = ({
	geometryTypeValue,
	typeValue,
	coordDimensionValue
}: GeometryTypeCodeSource): number | null => {
	const numericGeometryType = toFiniteNumber(geometryTypeValue);
	if (numericGeometryType != null) return Math.trunc(numericGeometryType);

	if (typeof typeValue !== 'string' || typeValue.trim().length === 0) return null;

	const baseGeometryTypeCode =
		BASE_GEOMETRY_TYPE_CODE_BY_NAME[normalizeGeometryTypeName(typeValue)];
	if (!baseGeometryTypeCode) return null;

	return baseGeometryTypeCode + toGeometryTypeOffset(coordDimensionValue);
};

const pushGeometryColumnInfo = (
	geometryColumnsMap: Map<string, SqliteGeometryColumnInfo[]>,
	tableName: string,
	info: SqliteGeometryColumnInfo
) => {
	const current = geometryColumnsMap.get(tableName) ?? [];
	current.push(info);
	geometryColumnsMap.set(tableName, current);
};

export const isExcludedSqliteTableName = (tableName: string): boolean => {
	const normalizedTableName = tableName.toLowerCase();

	return EXCLUDED_TABLE_NAMES.has(normalizedTableName)
		|| EXCLUDED_TABLE_PREFIXES.some((prefix) => normalizedTableName.startsWith(prefix));
};

export const parseGeometryColumnsRows = (
	columnNames: string[],
	rows: unknown[][]
): Map<string, SqliteGeometryColumnInfo[]> => {
	const geometryColumnsMap = new Map<string, SqliteGeometryColumnInfo[]>();
	if (columnNames.length === 0 || rows.length === 0) return geometryColumnsMap;

	const columnIndexes = new Map(
		columnNames.map((columnName, index) => [columnName.toLowerCase(), index] as const)
	);

	const tableNameIndex = columnIndexes.get('f_table_name');
	const columnNameIndex = columnIndexes.get('f_geometry_column');
	if (tableNameIndex == null || columnNameIndex == null) return geometryColumnsMap;

	const geometryTypeIndex = columnIndexes.get('geometry_type');
	const typeIndex = columnIndexes.get('type');
	const coordDimensionIndex = columnIndexes.get('coord_dimension');
	const sridIndex = columnIndexes.get('srid');
	const geometryFormatIndex = columnIndexes.get('geometry_format');

	for (const row of rows) {
		const tableName = row[tableNameIndex];
		const columnName = row[columnNameIndex];
		if (typeof tableName !== 'string' || typeof columnName !== 'string') continue;

		const info: SqliteGeometryColumnInfo = {
			columnName,
			geometryType: toGeometryTypeCode({
				geometryTypeValue: geometryTypeIndex == null ? null : row[geometryTypeIndex],
				typeValue: typeIndex == null ? null : row[typeIndex],
				coordDimensionValue: coordDimensionIndex == null ? null : row[coordDimensionIndex]
			}),
			srid: sridIndex == null ? null : toFiniteNumber(row[sridIndex]),
			geometryFormat: geometryFormatIndex == null
				? 'SpatiaLite'
				: (typeof row[geometryFormatIndex] === 'string' ? row[geometryFormatIndex] : null)
		};

		pushGeometryColumnInfo(geometryColumnsMap, tableName, info);
		const lowerCaseTableName = tableName.toLowerCase();
		if (lowerCaseTableName !== tableName) {
			pushGeometryColumnInfo(geometryColumnsMap, lowerCaseTableName, info);
		}
	}

	return geometryColumnsMap;
};

export const getGeometryColumnsForTable = (
	geometryColumnsMap: Map<string, SqliteGeometryColumnInfo[]>,
	tableName: string
): SqliteGeometryColumnInfo[] =>
	geometryColumnsMap.get(tableName)
		?? geometryColumnsMap.get(tableName.toLowerCase())
		?? [];

export const resolveSqliteColumnName = (
	columnNames: string[],
	columnName: string
): string | null => {
	const exactMatch = columnNames.find((name) => name === columnName);
	if (exactMatch) return exactMatch;

	const normalizedColumnName = columnName.toLowerCase();
	return (
		columnNames.find((name) => name.toLowerCase() === normalizedColumnName) ?? null
	);
};
