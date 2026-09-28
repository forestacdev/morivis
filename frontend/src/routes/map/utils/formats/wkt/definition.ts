import type { FormatDefinition } from '../format-definition';

export const formatWkt = {
	id: 'wkt',
	extensions: ['.wkt', '.ewkt']
} as const satisfies FormatDefinition;
