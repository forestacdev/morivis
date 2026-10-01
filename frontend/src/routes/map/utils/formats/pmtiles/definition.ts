import type { FormatDefinition } from '../format-definition';

export const formatPmtiles = {
	id: 'pmtiles',
	extensions: ['.pmtiles']
} as const satisfies FormatDefinition;
