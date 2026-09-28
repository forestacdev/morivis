import type { FormatDefinition } from '../format-definition';

export const formatBcf = {
	id: 'bcf',
	extensions: ['.bcf']
} as const satisfies FormatDefinition;
