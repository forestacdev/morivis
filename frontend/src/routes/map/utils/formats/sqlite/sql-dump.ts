import type { Database, SqlJsStatic, SqlValue } from 'sql.js';

type SqlDumpColumn = {
	name: string;
	type: string;
	isPrimaryKey: boolean;
	isGeometry: boolean;
	isInferred: boolean;
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

type ParsedSqlValue = {
	value: SqlValue;
	isGeometry: boolean;
	srid: number | null;
};

type SqlCopyBlock = {
	qualifiedNameParts: string[];
	columnNames: string[] | null;
	dataLines: string[];
};

const SQLITE_HEADER = new TextEncoder().encode('SQLite format 3\0');

// SQL は実行せず値だけを再構築するが、巨大入力によるブラウザ停止も避ける。
const SQL_DUMP_LIMITS = {
	textLength: 256 * 1024 * 1024,
	tableCount: 1024,
	columnCountPerTable: 4096,
	rowCount: 2_000_000,
	valueLength: 16 * 1024 * 1024,
	parenthesisDepth: 128
} as const;

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

const decodeIdentifier = (value: string): string => {
	if (value.startsWith('"')) return decodeQuotedIdentifier(value);
	if (value.startsWith('`')) return value.slice(1, -1).replace(/``/g, '`');
	if (value.startsWith('[')) return value.slice(1, -1).replace(/]]/g, ']');
	return value;
};

const parseQualifiedIdentifier = (value: string): string[] => {
	const parts: string[] = [];
	let index = 0;

	while (index < value.length) {
		while (/\s/.test(value[index] ?? '')) index += 1;
		if (index >= value.length) break;

		if (value[index] === '"' || value[index] === '`' || value[index] === '[') {
			const openingQuote = value[index];
			const closingQuote = openingQuote === '[' ? ']' : openingQuote;
			let cursor = index + 1;
			let buffer = openingQuote;

			while (cursor < value.length) {
				buffer += value[cursor];
				if (value[cursor] === closingQuote && value[cursor + 1] === closingQuote) {
					buffer += value[cursor + 1];
					cursor += 2;
					continue;
				}
				if (value[cursor] === closingQuote) {
					cursor += 1;
					break;
				}
				cursor += 1;
			}

			parts.push(decodeIdentifier(buffer));
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
	const isEscapeString = /^[eE]'/.test(value);
	const normalizedValue = isEscapeString ? value.slice(1) : value;
	const unquoted = normalizedValue.slice(1, -1).replace(/''/g, "'");
	if (!isEscapeString) return unquoted;

	return unquoted.replace(/\\(?:[btnrfv\\']|x[0-9a-fA-F]{2}|[0-7]{1,3})/g, (escape) => {
		const code = escape.slice(1);
		const namedEscapes: Record<string, string> = {
			b: '\b',
			t: '\t',
			n: '\n',
			r: '\r',
			f: '\f',
			v: '\v',
			'\\': '\\',
			"'": "'"
		};
		if (code in namedEscapes) return namedEscapes[code] ?? '';
		if (code.startsWith('x')) return String.fromCharCode(Number.parseInt(code.slice(1), 16));
		return String.fromCharCode(Number.parseInt(code, 8));
	});
};

const hexToBytes = (value: string): Uint8Array => {
	const bytes = new Uint8Array(value.length / 2);
	for (let index = 0; index < value.length; index += 2) {
		bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
	}
	return bytes;
};

const decodeHexValue = (value: string): Uint8Array | null => {
	const normalized = value.startsWith('\\x') || value.startsWith('0x')
		? value.slice(2)
		: value;
	if (normalized.length === 0 || normalized.length % 2 !== 0) return null;
	if (!/^[0-9a-fA-F]+$/.test(normalized)) return null;
	return hexToBytes(normalized);
};

const extractEwkbSrid = (value: SqlValue): number | null => {
	if (!(value instanceof Uint8Array) || value.length < 9) return null;
	const endianMarker = value[0];
	if (endianMarker !== 0 && endianMarker !== 1) return null;
	const view = new DataView(value.buffer, value.byteOffset, value.byteLength);
	const littleEndian = endianMarker === 1;
	const typeCode = view.getUint32(1, littleEndian);
	if ((typeCode & 0x20000000) === 0) return null;
	return view.getUint32(5, littleEndian);
};

const extractGeometrySrid = (expression: string, value: SqlValue): number | null => {
	const ewktMatch = expression.match(/\bSRID\s*=\s*(\d+)\s*;/i);
	if (ewktMatch) return Number(ewktMatch[1]);

	const functionSridMatch = expression.match(
		/^ST_(?:GeomFromText|GeometryFromText|GeomFromEWKT|GeomFromWKB|GeometryFromWKB|PointFromText|SetSRID)\s*\([\s\S]+,\s*(\d+)\s*\)$/i
	);
	if (functionSridMatch) return Number(functionSridMatch[1]);

	return extractEwkbSrid(value);
};

const stripPostgresTypeCast = (value: string): { literal: string; type: string; } | null => {
	const match = value.match(
		/^([\s\S]+?)::\s*((?:"(?:""|[^"])*")|(?:[\w.]+))(?:\[\])?(?:\s*\([^)]*\))?\s*$/i
	);
	if (!match) return null;
	return { literal: match[1].trim(), type: decodeIdentifier(match[2]) };
};

const parseSqlLiteral = (value: string): SqlValue => {
	const normalizedValue = value.trim();
	if (normalizedValue.length > SQL_DUMP_LIMITS.valueLength) {
		throw new Error('SQL の値が大きすぎるため読み込めません');
	}

	const cast = stripPostgresTypeCast(normalizedValue);
	if (cast) {
		const parsed = parseSqlLiteral(cast.literal);
		if (
			/^(?:.*\.)?(?:bytea|geometry|geography)$/i.test(cast.type) && typeof parsed === 'string'
		) {
			return decodeHexValue(parsed) ?? parsed;
		}
		return parsed;
	}

	const decodeMatch = normalizedValue.match(/^decode\s*\(\s*([\s\S]+?)\s*,\s*'hex'\s*\)$/i);
	if (decodeMatch) {
		const decoded = parseSqlLiteral(decodeMatch[1]);
		return typeof decoded === 'string' ? decodeHexValue(decoded) ?? decoded : decoded;
	}

	const setSridMatch = normalizedValue.match(/^ST_SetSRID\s*\(\s*([\s\S]+)\s*,\s*-?\d+\s*\)$/i);
	if (setSridMatch) return parseSqlLiteral(setSridMatch[1]);

	const geometryMatch = normalizedValue.match(
		/^ST_(?:GeomFromEWKB|GeomFromWKB|GeometryFromWKB)\s*\(\s*([\s\S]+?)(?:\s*,\s*-?\d+)?\s*\)$/i
	);
	if (geometryMatch) {
		const parsed = parseSqlLiteral(geometryMatch[1]);
		return typeof parsed === 'string' ? decodeHexValue(parsed) ?? parsed : parsed;
	}

	const textGeometryMatch = normalizedValue.match(
		/^ST_(?:GeomFromText|GeometryFromText|GeomFromEWKT|PointFromText)\s*\(\s*([\s\S]+?)(?:\s*,\s*-?\d+)?\s*\)$/i
	);
	if (textGeometryMatch) return parseSqlLiteral(textGeometryMatch[1]);

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

const parseSqlValue = (value: string): ParsedSqlValue => {
	const normalizedValue = value.trim();
	const parsedValue = parseSqlLiteral(normalizedValue);
	const srid = extractGeometrySrid(normalizedValue, parsedValue);
	return {
		value: parsedValue,
		isGeometry: /::\s*(?:[\w.]+\.)?(?:geometry|geography)\b/i.test(normalizedValue)
			|| /^ST_(?:Geom|Geometry|Point|SetSRID)/i.test(normalizedValue)
			|| srid != null
			|| (typeof parsedValue === 'string'
				&& /^\s*(?:POINT|LINESTRING|POLYGON|MULTI)/i.test(parsedValue)),
		srid
	};
};

const splitSqlStatements = (text: string): string[] => {
	const statements: string[] = [];
	let current = '';
	let inSingleQuote = false;
	let inDoubleQuote = false;
	let inLineComment = false;
	let inBlockComment = false;
	let dollarQuoteTag: string | null = null;

	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];
		const nextChar = text[index + 1];

		if (inLineComment) {
			if (char === '\n') {
				current += '\n';
				inLineComment = false;
			}
			continue;
		}

		if (inBlockComment) {
			if (char === '*' && nextChar === '/') {
				index += 1;
				current += ' ';
				inBlockComment = false;
			}
			continue;
		}

		if (dollarQuoteTag) {
			current += char;
			if (text.startsWith(dollarQuoteTag, index)) {
				current += dollarQuoteTag.slice(1);
				index += dollarQuoteTag.length - 1;
				dollarQuoteTag = null;
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
			index += 1;
			inLineComment = true;
			continue;
		}

		if (char === '/' && nextChar === '*') {
			index += 1;
			inBlockComment = true;
			continue;
		}

		if (char === '$') {
			const dollarQuoteMatch = text.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
			if (dollarQuoteMatch) {
				dollarQuoteTag = dollarQuoteMatch[0];
				current += dollarQuoteTag;
				index += dollarQuoteTag.length - 1;
				continue;
			}
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
	/\b(?:CREATE TABLE|ALTER TABLE|INSERT INTO|COPY\s+.+?\s+FROM\s+stdin)\b/i.test(text);

const extractCopyBlocks = (text: string): { sqlText: string; blocks: SqlCopyBlock[]; } => {
	const lines = text.replace(/\r\n?/g, '\n').split('\n');
	const blocks: SqlCopyBlock[] = [];
	const remainingLines: string[] = [];

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const header = line.match(
			/^\s*COPY\s+([\s\S]+?)\s+FROM\s+stdin(?:\s+WITH\s*\([^)]*\))?\s*;\s*$/i
		);
		if (!header) {
			remainingLines.push(line);
			continue;
		}

		const target = header[1].trim();
		const indentation = line.match(/^\s*/)?.[0] ?? '';
		const targetWithColumns = target.match(/^([\s\S]+?)\s*\(([\s\S]*)\)$/);
		const qualifiedNameParts = parseQualifiedIdentifier(targetWithColumns?.[1] ?? target);
		const columnNames = targetWithColumns
			? splitTopLevelCommaSeparated(targetWithColumns[2]).map((column) =>
				parseQualifiedIdentifier(column)[0] ?? column.trim()
			)
			: null;
		const dataLines: string[] = [];
		let terminated = false;

		for (index += 1; index < lines.length; index += 1) {
			if (lines[index].trim() === '\\.') {
				terminated = true;
				break;
			}
			dataLines.push(
				indentation && lines[index].startsWith(indentation)
					? lines[index].slice(indentation.length)
					: lines[index]
			);
		}

		if (!terminated) throw new Error('COPY 文の終端（\\.）が見つかりません');
		if (qualifiedNameParts.length === 0) throw new Error('COPY 文のテーブル名を解釈できません');
		blocks.push({ qualifiedNameParts, columnNames, dataLines });
		remainingLines.push('');
	}

	return { sqlText: remainingLines.join('\n'), blocks };
};

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
	if (tablesByQualifiedName.size >= SQL_DUMP_LIMITS.tableCount) {
		throw new Error('SQL に含まれるテーブル数が上限を超えています');
	}

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
	options: { isPrimaryKey?: boolean; isGeometry?: boolean; isInferred?: boolean; } = {}
) => {
	const current = table.columns.find((column) => column.name === columnName);
	if (current) {
		if (!options.isInferred || current.isInferred) current.type = columnType || current.type;
		current.isPrimaryKey ||= options.isPrimaryKey ?? false;
		current.isGeometry ||= options.isGeometry ?? false;
		current.isInferred &&= options.isInferred ?? false;
		return current;
	}
	if (table.columns.length >= SQL_DUMP_LIMITS.columnCountPerTable) {
		throw new Error(`テーブル「${table.name}」の列数が上限を超えています`);
	}

	const nextColumn: SqlDumpColumn = {
		name: columnName,
		type: columnType,
		isPrimaryKey: options.isPrimaryKey ?? false,
		isGeometry: options.isGeometry ?? false,
		isInferred: options.isInferred ?? false
	};
	table.columns.push(nextColumn);
	return nextColumn;
};

const inferColumnType = (value: SqlValue): string => {
	if (value === null) return 'NULL';
	if (value instanceof Uint8Array) return 'BLOB';
	if (typeof value === 'number') return Number.isInteger(value) ? 'INTEGER' : 'REAL';
	return 'TEXT';
};

const widenInferredColumnType = (current: string, next: string): string => {
	if (current === 'NULL') return next;
	if (next === 'NULL' || current === next) return current;
	if ((current === 'INTEGER' && next === 'REAL') || (current === 'REAL' && next === 'INTEGER')) {
		return 'REAL';
	}
	return 'TEXT';
};

const ensureInferredColumn = (
	table: MutableSqlDumpTable,
	columnName: string,
	value: SqlValue,
	isGeometry: boolean,
	srid: number | null = null
) => {
	const current = table.columns.find((column) => column.name === columnName);
	const previousType = current?.type ?? 'NULL';
	const wasInferred = current?.isInferred ?? false;
	const inferredType = isGeometry ? 'BLOB' : inferColumnType(value);
	const column = ensureColumn(table, columnName, inferredType, {
		isGeometry,
		isInferred: true
	});
	if (wasInferred) {
		column.type = widenInferredColumnType(previousType, inferredType);
	}
	const geometryColumn = table.geometryColumns.find((item) => item.columnName === columnName);
	if (isGeometry && !geometryColumn) {
		table.geometryColumns.push({
			columnName,
			srid,
			geometryType: null,
			coordDimension: null
		});
	} else if (geometryColumn && geometryColumn.srid == null && srid != null) {
		geometryColumn.srid = srid;
	}
};

const appendRow = (table: MutableSqlDumpTable, row: Record<string, SqlValue>) => {
	if (table.rows.length >= SQL_DUMP_LIMITS.rowCount) {
		throw new Error(`テーブル「${table.name}」の行数が上限を超えています`);
	}
	table.rows.push(row);
};

const parseDeclaredGeometry = (
	columnDefinition: string
): Omit<SqlDumpGeometryColumn, 'columnName'> | null => {
	const match = columnDefinition.match(
		/\b(?:[\w"]+\.)?(?:geometry|geography)\s*(?:\(\s*([A-Za-z]+)\s*(?:,\s*(\d+))?\s*\))?/i
	);
	if (!match) return null;

	const rawType = match[1]?.toUpperCase() ?? null;
	const geometryType = rawType
		? Object.keys(BASE_GEOMETRY_TYPE_CODE_BY_NAME).find((name) => rawType.startsWith(name))
			?? null
		: null;
	const dimensionSuffix = geometryType ? rawType?.slice(geometryType.length) : null;
	const coordDimension = dimensionSuffix === 'ZM'
		? 'XYZM'
		: dimensionSuffix === 'Z'
		? 'XYZ'
		: dimensionSuffix === 'M'
		? 'XYM'
		: 2;

	return {
		srid: match[2] ? Number(match[2]) : null,
		geometryType,
		coordDimension
	};
};

const registerDeclaredGeometry = (
	table: MutableSqlDumpTable,
	columnName: string,
	declaration: Omit<SqlDumpGeometryColumn, 'columnName'>
) => {
	const current = table.geometryColumns.find((column) => column.columnName === columnName);
	if (!current) {
		table.geometryColumns.push({ columnName, ...declaration });
		return;
	}
	current.srid ??= declaration.srid;
	current.geometryType ??= declaration.geometryType;
	current.coordDimension ??= declaration.coordDimension;
};

const parseCreateTableColumns = (table: MutableSqlDumpTable, body: string) => {
	for (const columnDefinition of splitTopLevelCommaSeparated(body)) {
		const normalizedDefinition = columnDefinition.trim();
		if (
			!normalizedDefinition
			|| /^(?:CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK)\b/i.test(
				normalizedDefinition
			)
		) continue;

		const match = normalizedDefinition.match(
			/^("(?:""|[^"])*"|`(?:``|[^`])*`|\[(?:]]|[^\]])*]|[^\s]+)\s+([\s\S]+)$/
		);
		if (!match) continue;

		const columnName = parseQualifiedIdentifier(match[1])[0];
		if (!columnName) continue;

		const remainder = match[2].trim();
		const geometryDeclaration = parseDeclaredGeometry(remainder);
		ensureColumn(table, columnName, remainder, {
			isPrimaryKey: /\bPRIMARY\s+KEY\b/i.test(remainder),
			isGeometry: geometryDeclaration != null
		});
		if (geometryDeclaration) registerDeclaredGeometry(table, columnName, geometryDeclaration);
	}
};

const parseAlterTableAddColumn = (
	table: MutableSqlDumpTable,
	statement: string
): boolean => {
	const match = statement.match(
		/^ALTER TABLE\s+(?:ONLY\s+)?(.+?)\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?("(?:""|[^"])*"|`(?:``|[^`])*`|\[(?:]]|[^\]])*]|[^\s]+)\s+([\s\S]+)$/i
	);
	if (!match) return false;

	const columnName = parseQualifiedIdentifier(match[2])[0];
	if (!columnName) return true;

	const remainder = match[3].trim();
	const geometryDeclaration = parseDeclaredGeometry(remainder);
	ensureColumn(table, columnName, remainder, {
		isPrimaryKey: /\bPRIMARY\s+KEY\b/i.test(remainder),
		isGeometry: geometryDeclaration != null
	});
	if (geometryDeclaration) registerDeclaredGeometry(table, columnName, geometryDeclaration);
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
	if (!table.geometryColumns.some((item) => item.columnName === columnName)) {
		table.geometryColumns.push({
			columnName,
			srid: typeof args[3] === 'number' ? args[3] : Number(args[3] ?? NaN) || null,
			geometryType: typeof args[4] === 'string' ? args[4] : null,
			coordDimension: typeof args[5] === 'number' || typeof args[5] === 'string'
				? args[5]
				: null
		});
	}
	return true;
};

const parseInsertValues = (value: string): ParsedSqlValue[][] => {
	const tuples: ParsedSqlValue[][] = [];
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
				if (depth > SQL_DUMP_LIMITS.parenthesisDepth) {
					throw new Error('INSERT 文の括弧が深すぎるため読み込めません');
				}
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

		if (depth !== 0) throw new Error('INSERT 文の VALUES 句が閉じられていません');
		tuples.push(tokens.map(parseSqlValue));
	}

	return tuples;
};

const parseInsertIntoStatement = (
	table: MutableSqlDumpTable,
	statement: string
): boolean => {
	const match = statement.match(
		/^INSERT INTO\s+(?:ONLY\s+)?(.+?)(?:\s*\(([\s\S]*?)\))?\s+VALUES\s*([\s\S]+)$/i
	);
	if (!match) return false;

	const columnNames = match[2]
		? splitTopLevelCommaSeparated(match[2]).map((column) => {
			const identifier = parseQualifiedIdentifier(column);
			return identifier[0] ?? column.trim();
		})
		: table.columns.map((column) => column.name);
	const tuples = parseInsertValues(match[3]);
	if (columnNames.length === 0) {
		throw new Error(`列名のない INSERT 文にはテーブル定義が必要です: ${table.qualifiedName}`);
	}

	for (const values of tuples) {
		if (values.length !== columnNames.length) {
			throw new Error(`INSERT 文の列数と値の数が一致しません: ${table.qualifiedName}`);
		}
		const row: Record<string, SqlValue> = {};

		columnNames.forEach((columnName, index) => {
			const geometryColumn = table.geometryColumns.find((column) =>
				column.columnName === columnName
			);
			const parsedValue = values[index] ?? { value: null, isGeometry: false, srid: null };
			const rawValue = parsedValue.value;
			if (
				geometryColumn
				&& typeof rawValue === 'string'
			) {
				row[columnName] = decodeHexValue(rawValue) ?? rawValue;
			} else {
				row[columnName] = rawValue;
			}
			ensureInferredColumn(
				table,
				columnName,
				row[columnName] ?? null,
				parsedValue.isGeometry || Boolean(geometryColumn),
				parsedValue.srid
			);
		});

		appendRow(table, row);
	}

	return true;
};

const parseCopyTextValue = (value: string): SqlValue => {
	if (value === '\\N') return null;
	const unescaped = value.replace(/\\(?:[btnrfv\\]|[0-7]{1,3})/g, (escape) => {
		const code = escape.slice(1);
		const namedEscapes: Record<string, string> = {
			b: '\b',
			t: '\t',
			n: '\n',
			r: '\r',
			f: '\f',
			v: '\v',
			'\\': '\\'
		};
		if (code in namedEscapes) return namedEscapes[code] ?? '';
		return String.fromCharCode(Number.parseInt(code, 8));
	});
	if (/^true$/i.test(unescaped)) return 1;
	if (/^false$/i.test(unescaped)) return 0;
	if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(unescaped)) return Number(unescaped);
	return unescaped;
};

const applyCopyBlock = (
	table: MutableSqlDumpTable,
	block: SqlCopyBlock
) => {
	const columnNames = block.columnNames ?? table.columns.map((column) => column.name);
	if (columnNames.length === 0) {
		throw new Error(`列名のない COPY 文にはテーブル定義が必要です: ${table.qualifiedName}`);
	}

	for (const line of block.dataLines) {
		const rawValues = line.split('\t');
		if (rawValues.length !== columnNames.length) {
			throw new Error(`COPY 文の列数と値の数が一致しません: ${table.qualifiedName}`);
		}
		const row: Record<string, SqlValue> = {};
		columnNames.forEach((columnName, index) => {
			const geometryColumn = table.geometryColumns.find((column) =>
				column.columnName === columnName
			);
			const parsedValue = parseCopyTextValue(rawValues[index] ?? '');
			const inferredSrid = typeof parsedValue === 'string'
				? extractGeometrySrid(parsedValue, parsedValue)
				: extractEwkbSrid(parsedValue);
			const isGeometryValue = Boolean(geometryColumn)
				|| inferredSrid != null
				|| (typeof parsedValue === 'string'
					&& /^\s*(?:POINT|LINESTRING|POLYGON|MULTI)/i.test(parsedValue));
			row[columnName] = geometryColumn && typeof parsedValue === 'string'
				? decodeHexValue(parsedValue) ?? parsedValue
				: parsedValue;
			ensureInferredColumn(
				table,
				columnName,
				row[columnName] ?? null,
				isGeometryValue,
				inferredSrid
			);
		});
		appendRow(table, row);
	}
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
	if (normalizedType.includes('blob') || normalizedType.includes('bytea')) return 'BLOB';
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

const getGeometryFormat = (
	table: SqlDumpTable,
	columnName: string
): 'EWKB' | 'WKT' =>
	table.rows.some((row) => {
			const value = row[columnName];
			return typeof value === 'string'
				&& /^\s*(?:SRID\s*=\s*\d+\s*;\s*)?(?:POINT|LINESTRING|POLYGON|MULTI)/i.test(value);
		})
		? 'WKT'
		: 'EWKB';

export const parseSqlDump = (text: string): SqlDumpTable[] => {
	if (text.length > SQL_DUMP_LIMITS.textLength) {
		throw new Error('SQL ファイルが大きすぎるため読み込めません');
	}
	if (!looksLikeSqlDumpText(text)) {
		throw new Error('対応していない SQL ダンプ形式です');
	}

	const resolveTableName = createTableNameResolver();
	const tablesByQualifiedName = new Map<string, MutableSqlDumpTable>();
	const { sqlText, blocks: copyBlocks } = extractCopyBlocks(text);
	const statements = splitSqlStatements(sqlText);

	for (const statement of statements) {
		if (/^(?:SET|BEGIN|COMMIT|DROP TABLE)\b/i.test(statement)) continue;

		const createTableMatch = statement.match(
			/^CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:ONLY\s+)?(.+?)\s*\(([\s\S]*)\)(?:\s+[\s\S]*)?$/i
		);
		if (createTableMatch) {
			const qualifiedNameParts = parseQualifiedIdentifier(createTableMatch[1]);
			if (qualifiedNameParts.length === 0) continue;
			const table = getOrCreateTable(
				tablesByQualifiedName,
				resolveTableName,
				qualifiedNameParts
			);
			parseCreateTableColumns(table, createTableMatch[2]);
			continue;
		}

		const qualifiedIdentifierMatch = statement.match(
			/^(?:ALTER TABLE|INSERT INTO)\s+(?:ONLY\s+)?(.+?)(?:\s+ADD COLUMN|\s*\(|\s+VALUES)/i
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

	for (const copyBlock of copyBlocks) {
		const table = getOrCreateTable(
			tablesByQualifiedName,
			resolveTableName,
			copyBlock.qualifiedNameParts
		);
		applyCopyBlock(table, copyBlock);
	}

	const tables = Array.from(tablesByQualifiedName.values()).filter((table) =>
		table.columns.length > 0
	);
	if (tables.length === 0) {
		throw new Error('SQL から読み込めるテーブルまたは列を見つけられませんでした');
	}
	return tables;
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
					getGeometryFormat(table, geometryColumn.columnName)
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
