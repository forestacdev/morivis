import type { FormatDefinition } from '../format-definition';
import { formatSqlDump } from '../sqlite/sql-dump-definition';

export const formatSqlite = {
	id: 'sqlite',
	extensions: ['.sqlite', '.sqlite3', '.db', '.db3', ...formatSqlDump.extensions],
	variants: [formatSqlDump]
} as const satisfies FormatDefinition;
