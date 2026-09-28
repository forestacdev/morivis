import type { FormatDefinition } from '../format-definition';

export const format3dm = {
	id: '3dm',
	extensions: ['.3dm']
} as const satisfies FormatDefinition;
