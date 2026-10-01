import type { FormatDefinition } from '../format-definition';

export const formatMbtiles = {
	id: 'mbtiles',
	extensions: ['.mbtiles']
} as const satisfies FormatDefinition;
