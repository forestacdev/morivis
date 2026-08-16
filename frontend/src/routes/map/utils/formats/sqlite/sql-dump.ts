import type { Database, SqlJsStatic, SqlValue } from 'sql.js';

type SqlDumpColumn = {
	name: string;
	type: string;
	isPrimaryKey: boolean;
	isGeometry: boolean;
};

type SqlDumpGeometryColumn = {
	columnName: string;
	srid: number | null;
	geometryType: string | null;
	coordDimension: number | string | null;
};

export type SqlDumpTable = {
	qualifiedName: string;
	name: string;
	columns: SqlDumpColumn[];
	geometryColumns: SqlDumpGeometryColumn[];
	rows: Record<string, SqlValue>[];
};

type MutableSqlDumpTable = SqlDumpTable;

const SQLITE_HEADER = new TextEncoder().encode('SQLite format 3\0');

const BASE_GEOMETRY_TYPE_CODE_BY_NAME: Record<string, number> = {
	POINT: 1,
	LINESTRING: 2,
	POLYGON: 3,
	MULTIPOINT: 4,
	MULTILINESTRING: 5,
	MULTIPOLYGON: 6,
	GEOMETRYCOLLECTION: 7
};

const quoteIdentifier = (value: string): string => `"${value.replace(/"/g, '""')}"`;

const decodeQuotedIdentifier = (value: string): string => value.slice(1, -1).replace(/""/g, '"');

const parseQualifiedIdentifier = (value: string): string[] => {
	const parts: string[] = [];
	let index = 0;

	while (index < value.length) {
		while (/\s/.test(value[index] ?? '')) index += 1;
		if (index >= value.length) break;

		if (value[index] === '"') {
			let cursor = index + 1;
			let buffer = '"';

			while (cursor < value.length) {
				buffer += value[cursor];
				if (value[cursor] === '"' && value[cursor + 1] === '"') {
					buffer += value[cursor + 1];
					cursor += 2;
					continue;
				}
				if (value[cursor] === '"') {
					cursor += 1;
					break;
				}
				cursor += 1;
			}

			parts.push(decodeQuotedIdentifier(buffer));
			index = cursor;
		} else {
			let cursor = index;
			while (cursor < value.length && !/[\s.]/.test(value[cursor] ?? '')) cursor += 1;
			parts.push(value.slice(index, cursor));
			index = cursor;
		}

		while (/\s/.test(value[index] ?? '')) index += 1;
		if (value[index] === '.') {
			index += 1;
		}
	}

	return parts.filter((part) => part.length > 0);
};

const splitTopLevelCommaSeparated = (value: string): string[] => {
	const parts: string[] = [];
	let current = '';
	let inSingleQuote = false;
	let inDoubleQuote = false;
	let parenthesisDepth = 0;

	for (let index = 0; index < value.length; index += 1) {
		const char = value[index];
		const nextChar = value[index + 1];

		if (inSingleQuote) {
			current += char;
			if (char === "'" && nextChar === "'") {
				current += nextChar;
				index += 1;
				continue;
			}
			if (char === "'") inSingleQuote = false;
			continue;
		}

		if (inDoubleQuote) {
			current += char;
			if (char === '"' && nextChar === '"') {
				current += nextChar;
				index += 1;
				continue;
			}
			if (char === '"') inDoubleQuote = false;
			continue;
		}

		if (char === "'") {
			inSingleQuote = true;
			current += char;
			continue;
		}

		if (char === '"') {
			inDoubleQuote = true;
			current += char;
			continue;
		}

		if (char === '(') {
			parenthesisDepth += 1;
			current += char;
			continue;
		}

		if (char === ')') {
			parenthesisDepth = Math.max(0, parenthesisDepth - 1);
			current += char;
			continue;
		}

		if (char === ',' && parenthesisDepth === 0) {
			parts.push(current.trim());
			current = '';
			continue;
		}

		current += char;
	}

	if (current.trim().length > 0) {
		parts.push(current.trim());
	}

	return parts;
};

const parseSqlStringLiteral = (value: string): string => {
	const normalizedValue = value.startsWith("E'") ? value.slice(1) : value;
	return normalizedValue.slice(1, -1).replace(/''/g, "'");
};

const parseSqlLiteral = (value: string): SqlValue => {
	const normalizedValue = value.trim();
	if (/^null$/i.test(normalizedValue)) return null;
	if (/^true$/i.test(normalizedValue)) return 1;
	if (/^false$/i.test(normalizedValue)) return 0;
	if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(normalizedValue)) {
		return Number(normalizedValue);
	}
	if (/^(?:E)?'.*'$/.test(normalizedValue)) {
		return parseSqlStringLiteral(normalizedValue);
	}

	return normalizedValue;
};

const hexToBytes = (value: string): Uint8Array => {
	const bytes = new Uint8Array(value.length / 2);
	for (let index = 0; index < value.length; index += 2) {
		bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
	}
	return bytes;
};

const splitSqlStatements = (text: string): string[] => {
	const statements: string[] = [];
	let current = '';
	let inSingleQuote = false;
	let inDoubleQuote = false;
	let inLineComment = false;
	let inBlockComment = false;

	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];
		const nextChar = text[index + 1];

		if (inLineComment) {
			current += char;
			if (char === '\n') inLineComment = false;
			continue;
		}

		if (inBlockComment) {
			current += char;
			if (char === '*' && nextChar === '/') {
				current += nextChar;
				index += 1;
				inBlockComment = false;
			}
			continue;
		}

		if (inSingleQuote) {
			current += char;
			if (char === "'" && nextChar === "'") {
				current += nextChar;
				index += 1;
				continue;
			}
			if (char === "'") inSingleQuote = false;
			continue;
		}

		if (inDoubleQuote) {
			current += char;
			if (char === '"' && nextChar === '"') {
				current += nextChar;
				index += 1;
				continue;
			}
			if (char === '"') inDoubleQuote = false;
			continue;
		}

		if (char === '-' && nextChar === '-') {
			current += char + nextChar;
			index += 1;
			inLineComment = true;
			continue;
		}

		if (char === '/' && nextChar === '*') {
			current += char + nextChar;
			index += 1;
			inBlockComment = true;
			continue;
		}

		if (char === "'") {
			current += char;
			inSingleQuote = true;
			continue;
		}

		if (char === '"') {
			current += char;
			inDoubleQuote = true;
			continue;
		}

		if (char === ';') {
			const statement = current.trim();
			if (statement.length > 0) statements.push(statement);
			current = '';
			continue;
		}

		current += char;
	}

	const statement = current.trim();
	if (statement.length > 0) statements.push(statement);

	return statements;
};

const looksLikeSqlDumpText = (text: string): boolean =>
	/\b(?:CREATE TABLE|ALTER TABLE|INSERT INTO)\b/i.test(text);

const createTableNameResolver = () => {
	const usedNames = new Set<string>();

	return (qualifiedNameParts: string[]): string => {
		const baseName = qualifiedNameParts.at(-1) ?? 'table';
		if (!usedNames.has(baseName)) {
			usedNames.add(baseName);
			return baseName;
		}

		const schemaName = qualifiedNameParts.at(-2);
		if (schemaName) {
			const schemaBasedName = `${schemaName}__${baseName}`;
			if (!usedNames.has(schemaBasedName)) {
				usedNames.add(schemaBasedName);
				return schemaBasedName;
			}
		}

		let suffix = 2;
		while (usedNames.has(`${baseName}__${suffix}`)) suffix += 1;
		const resolvedName = `${baseName}__${suffix}`;
		usedNames.add(resolvedName);
		return resolvedName;
	};
};

const getOrCreateTable = (
	tablesByQualifiedName: Map<string, MutableSqlDumpTable>,
	resolveTableName: (qualifiedNameParts: string[]) => string,
	qualifiedNameParts: string[]
): MutableSqlDumpTable => {
	const qualifiedName = qualifiedNameParts.join('.');
	const current = tablesByQualifiedName.get(qualifiedName);
	if (current) return current;

	const table: MutableSqlDumpTable = {
		qualifiedName,
		name: resolveTableName(qualifiedNameParts),
		columns: [],
		geometryColumns: [],
		rows: []
	};
	tablesByQualifiedName.set(qualifiedName, table);
	return table;
};

const ensureColumn = (
	table: MutableSqlDumpTable,
	columnName: string,
	columnType: string,
	options: { isPrimaryKey?: boolean; isGeometry?: boolean; } = {}
) => {
	const current = table.columns.find((column) => column.name === columnName);
	if (current) {
		current.type ||= columnType;
		current.isPrimaryKey ||= options.isPrimaryKey ?? false;
		current.isGeometry ||= options.isGeometry ?? false;
		return current;
	}

	const nextColumn: SqlDumpColumn = {
		name: columnName,
		type: columnType,
		isPrimaryKey: options.isPrimaryKey ?? false,
		isGeometry: options.isGeometry ?? false
	};
	table.columns.push(nextColumn);
	return nextColumn;
};

const parseCreateTableColumns = (table: MutableSqlDumpTable, body: string) => {
	for (const columnDefinition of splitTopLevelCommaSeparated(body)) {
		const normalizedDefinition = columnDefinition.trim();
		if (!normalizedDefinition || /^CONSTRAINT\b/i.test(normalizedDefinition)) continue;

		const match = normalizedDefinition.match(/^("(?:""|[^"])*"|[^\s]+)\s+([\s\S]+)$/);
		if (!match) continue;

		const columnName = parseQualifiedIdentifier(match[1])[0];
		if (!columnName) continue;

		const remainder = match[2].trim();
		ensureColumn(table, columnName, remainder, {
			isPrimaryKey: /\bPRIMARY\s+KEY\b/i.test(remainder)
		});
	}
};

const parseAlterTableAddColumn = (
	table: MutableSqlDumpTable,
	statement: string
): boolean => {
	const match = statement.match(
		/^ALTER TABLE\s+(.+?)\s+ADD COLUMN\s+("(?:""|[^"])*"|[^\s]+)\s+([\s\S]+)$/i
	);
	if (!match) return false;

	const columnName = parseQualifiedIdentifier(match[2])[0];
	if (!columnName) return true;

	const remainder = match[3].trim();
	ensureColumn(table, columnName, remainder, {
		isPrimaryKey: /\bPRIMARY\s+KEY\b/i.test(remainder)
	});
	return true;
};

const parseAddGeometryColumn = (
	table: MutableSqlDumpTable,
	statement: string
): boolean => {
	const match = statement.match(/^SELECT\s+AddGeometryColumn\s*\(([\s\S]+)\)$/i);
	if (!match) return false;

	const args = splitTopLevelCommaSeparated(match[1]).map(parseSqlLiteral);
	const columnName = typeof args[2] === 'string' ? args[2] : null;
	if (!columnName) return true;

	ensureColumn(table, columnName, 'BLOB', { isGeometry: true });
	table.geometryColumns.push({
		columnName,
		srid: typeof args[3] === 'number' ? args[3] : Number(args[3] ?? NaN) || null,
		geometryType: typeof args[4] === 'string' ? args[4] : null,
		coordDimension: typeof args[5] === 'number' || typeof args[5] === 'string' ? args[5] : null
	});
	return true;
};

const parseInsertValues = (value: string): SqlValue[][] => {
	const tuples: SqlValue[][] = [];
	let index = 0;

	while (index < value.length) {
		while (index < value.length && /[\s,]/.test(value[index] ?? '')) index += 1;
		if (index >= value.length) break;
		if (value[index] !== '(') {
			throw new Error('INSERT 文の VALUES 句を解釈できませんでした');
		}

		index += 1;
		let current = '';
		let inSingleQuote = false;
		let inDoubleQuote = false;
		let depth = 1;
		const tokens: string[] = [];

		while (index < value.length && depth > 0) {
			const char = value[index];
			const nextChar = value[index + 1];

			if (inSingleQuote) {
				current += char;
				if (char === "'" && nextChar === "'") {
					current += nextChar;
					index += 2;
					continue;
				}
				if (char === "'") inSingleQuote = false;
				index += 1;
				continue;
			}

			if (inDoubleQuote) {
				current += char;
				if (char === '"' && nextChar === '"') {
					current += nextChar;
					index += 2;
					continue;
				}
				if (char === '"') inDoubleQuote = false;
				index += 1;
				continue;
			}

			if (char === "'") {
				inSingleQuote = true;
				current += char;
				index += 1;
				continue;
			}

			if (char === '"') {
				inDoubleQuote = true;
				current += char;
				index += 1;
				continue;
			}

			if (char === '(') {
				depth += 1;
				current += char;
				index += 1;
				continue;
			}

			if (char === ')') {
				depth -= 1;
				if (depth === 0) {
					tokens.push(current.trim());
					current = '';
					index += 1;
					break;
				}
				current += char;
				index += 1;
				continue;
			}

			if (char === ',' && depth === 1) {
				tokens.push(current.trim());
				current = '';
				index += 1;
				continue;
			}

			current += char;
			index += 1;
		}

		tuples.push(tokens.map(parseSqlLiteral));
	}

	return tuples;
};

const parseInsertIntoStatement = (
	table: MutableSqlDumpTable,
	statement: string
): boolean => {
	const match = statement.match(/^INSERT INTO\s+(.+?)\s*\(([\s\S]*?)\)\s*VALUES\s*([\s\S]+)$/i);
	if (!match) return false;

	const columnNames = splitTopLevelCommaSeparated(match[2]).map((column) => {
		const identifier = parseQualifiedIdentifier(column);
		return identifier[0] ?? column.trim();
	});
	const tuples = parseInsertValues(match[3]);

	for (const values of tuples) {
		const row: Record<string, SqlValue> = {};

		columnNames.forEach((columnName, index) => {
			const geometryColumn = table.geometryColumns.find((column) =>
				column.columnName === columnName
			);
			const rawValue = values[index] ?? null;
			if (
				geometryColumn
				&& typeof rawValue === 'string'
				&& rawValue.length % 2 === 0
				&& /^[0-9A-Fa-f]+$/.test(rawValue)
			) {
				row[columnName] = hexToBytes(rawValue);
				return;
			}
			row[columnName] = rawValue;
		});

		table.rows.push(row);
	}

	return true;
};

const isSqliteFile = (data: Uint8Array): boolean =>
	data.length >= SQLITE_HEADER.length
	&& SQLITE_HEADER.every((value, index) => data[index] === value);

const toGeometryTypeCode = (
	geometryType: string | null,
	coordDimension: number | string | null
): number | null => {
	if (!geometryType) return null;

	const baseTypeCode = BASE_GEOMETRY_TYPE_CODE_BY_NAME[geometryType.toUpperCase()];
	if (!baseTypeCode) return null;

	if (typeof coordDimension === 'string') {
		const normalized = coordDimension.trim().toUpperCase();
		if (normalized === 'XYZ') return baseTypeCode + 1000;
		if (normalized === 'XYM') return baseTypeCode + 2000;
		if (normalized === 'XYZM') return baseTypeCode + 3000;
		return baseTypeCode;
	}

	if (coordDimension === 4) return baseTypeCode + 3000;
	if (coordDimension === 3) return baseTypeCode + 1000;
	return baseTypeCode;
};

const toSQLiteColumnType = (column: SqlDumpColumn): string => {
	if (column.isGeometry) return 'BLOB';

	const normalizedType = column.type.trim().toLowerCase();
	if (column.isPrimaryKey && normalizedType.includes('serial')) {
		return 'INTEGER';
	}
	if (
		normalizedType.includes('int')
		|| normalizedType.includes('serial')
		|| normalizedType.includes('bool')
	) {
		return 'INTEGER';
	}
	if (
		normalizedType.includes('float')
		|| normalizedType.includes('double')
		|| normalizedType.includes('numeric')
		|| normalizedType.includes('decimal')
		|| normalizedType.includes('real')
	) {
		return 'REAL';
	}

	return 'TEXT';
};

export const parseSqlDump = (text: string): SqlDumpTable[] => {
	if (!looksLikeSqlDumpText(text)) {
		throw new Error('対応していない SQL ダンプ形式です');
	}

	const resolveTableName = createTableNameResolver();
	const tablesByQualifiedName = new Map<string, MutableSqlDumpTable>();
	const statements = splitSqlStatements(text);

	for (const statement of statements) {
		if (/^(?:SET|BEGIN|COMMIT|DROP TABLE)\b/i.test(statement)) continue;

		const createTableMatch = statement.match(/^CREATE TABLE\s+(.+?)\s*\(([\s\S]*)\)$/i);
		if (createTableMatch) {
			const table = getOrCreateTable(
				tablesByQualifiedName,
				resolveTableName,
				parseQualifiedIdentifier(createTableMatch[1])
			);
			parseCreateTableColumns(table, createTableMatch[2]);
			continue;
		}

		const qualifiedIdentifierMatch = statement.match(
			/^(?:ALTER TABLE|INSERT INTO)\s+(.+?)(?:\s+ADD COLUMN|\s*\(|\s+VALUES)/i
		);
		const qualifiedNameParts = qualifiedIdentifierMatch
			? parseQualifiedIdentifier(qualifiedIdentifierMatch[1])
			: null;

		if (qualifiedNameParts?.length) {
			const table = getOrCreateTable(
				tablesByQualifiedName,
				resolveTableName,
				qualifiedNameParts
			);

			if (parseAlterTableAddColumn(table, statement)) continue;
			if (parseInsertIntoStatement(table, statement)) continue;
		}

		const addGeometryMatch = statement.match(/^SELECT\s+AddGeometryColumn\s*\(([\s\S]+)\)$/i);
		if (addGeometryMatch) {
			const args = splitTopLevelCommaSeparated(addGeometryMatch[1]).map(parseSqlLiteral);
			const schemaName = typeof args[0] === 'string' ? args[0] : '';
			const tableName = typeof args[1] === 'string' ? args[1] : '';
			if (!tableName) continue;
			const table = getOrCreateTable(
				tablesByQualifiedName,
				resolveTableName,
				schemaName ? [schemaName, tableName] : [tableName]
			);
			parseAddGeometryColumn(table, statement);
		}
	}

	return Array.from(tablesByQualifiedName.values());
};

export const populateDatabaseFromSqlDump = (
	database: Database,
	tables: SqlDumpTable[]
): void => {
	database.run(`
		CREATE TABLE geometry_columns (
			f_table_name TEXT,
			f_geometry_column TEXT,
			geometry_type INTEGER,
			coord_dimension INTEGER,
			srid INTEGER,
			geometry_format TEXT
		);
	`);

	for (const table of tables) {
		if (table.columns.length === 0) continue;

		const columnDefinitions = table.columns.map((column) => {
			const base = `${quoteIdentifier(column.name)} ${toSQLiteColumnType(column)}`;
			return column.isPrimaryKey ? `${base} PRIMARY KEY` : base;
		});
		database.run(
			`CREATE TABLE ${quoteIdentifier(table.name)} (${columnDefinitions.join(', ')})`
		);

		if (table.rows.length > 0) {
			const insertColumns = table.columns.map((column) => column.name);
			const insertSql = `INSERT INTO ${quoteIdentifier(table.name)} `
				+ `(${insertColumns.map(quoteIdentifier).join(', ')}) VALUES `
				+ `(${insertColumns.map(() => '?').join(', ')})`;

			for (const row of table.rows) {
				database.run(
					insertSql,
					insertColumns.map((columnName) => row[columnName] ?? null)
				);
			}
		}

		for (const geometryColumn of table.geometryColumns) {
			database.run(
				`INSERT INTO geometry_columns (
					f_table_name,
					f_geometry_column,
					geometry_type,
					coord_dimension,
					srid,
					geometry_format
				) VALUES (?, ?, ?, ?, ?, ?)`,
				[
					table.name,
					geometryColumn.columnName,
					toGeometryTypeCode(geometryColumn.geometryType, geometryColumn.coordDimension),
					typeof geometryColumn.coordDimension === 'number'
						? geometryColumn.coordDimension
						: Number(geometryColumn.coordDimension ?? NaN) || null,
					geometryColumn.srid,
					'EWKB'
				]
			);
		}
	}
};

export const createDatabaseFromBytes = (
	SQL: SqlJsStatic,
	data: Uint8Array
): Database => {
	if (isSqliteFile(data)) {
		return new SQL.Database(data);
	}

	const text = new TextDecoder().decode(data);
	const tables = parseSqlDump(text);
	const database = new SQL.Database();
	populateDatabaseFromSqlDump(database, tables);
	return database;
};

export const isSupportedSqliteInput = (data: Uint8Array): boolean => {
	if (isSqliteFile(data)) return true;
	return looksLikeSqlDumpText(new TextDecoder().decode(data));
};
