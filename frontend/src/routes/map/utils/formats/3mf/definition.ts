import type { FormatDefinition } from '../format-definition';

export const format3mf = {
	id: '3mf',
	extensions: ['.3mf']
} as const satisfies FormatDefinition;
