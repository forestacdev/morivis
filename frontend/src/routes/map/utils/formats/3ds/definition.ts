import type { FormatDefinition } from '../format-definition';

export const format3ds = {
	id: '3ds',
	extensions: ['.3ds']
} as const satisfies FormatDefinition;
