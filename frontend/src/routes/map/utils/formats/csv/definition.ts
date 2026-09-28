import type { FormatDefinition } from '../format-definition';

export const formatCsv = {
	id: 'csv',
	extensions: ['.csv']
} as const satisfies FormatDefinition;
