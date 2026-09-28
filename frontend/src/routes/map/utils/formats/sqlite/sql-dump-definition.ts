import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatSqlDump = {
	id: 'sql-dump',
	extensions: ['.sql'],
	limits: { maxTextLength: 256 * MiB }
} as const satisfies FormatDefinition;
