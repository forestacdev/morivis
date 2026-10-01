import type { FormatDefinition } from '../format-definition';

export const formatHgt = {
	id: 'hgt',
	extensions: ['.hgt'],
	limits: { maxFileBytes: 3601 * 3601 * 2 }
} as const satisfies FormatDefinition;
