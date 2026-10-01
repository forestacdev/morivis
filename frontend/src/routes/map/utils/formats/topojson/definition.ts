import type { FormatDefinition } from '../format-definition';

export const formatTopojson = {
	id: 'topojson',
	extensions: ['.topojson']
} as const satisfies FormatDefinition;
