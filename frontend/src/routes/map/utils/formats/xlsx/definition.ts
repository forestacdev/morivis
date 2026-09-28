import type { FormatDefinition } from '../format-definition';

export const formatXlsx = {
	id: 'xlsx',
	extensions: ['.xlsx']
} as const satisfies FormatDefinition;
