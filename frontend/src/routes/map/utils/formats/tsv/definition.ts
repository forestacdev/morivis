import type { FormatDefinition } from '../format-definition';

export const formatTsv = {
	id: 'tsv',
	extensions: ['.tsv']
} as const satisfies FormatDefinition;
