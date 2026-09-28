import type { FormatDefinition } from '../format-definition';

export const formatGeojson = {
	id: 'geojson',
	extensions: ['.geojson', '.json']
} as const satisfies FormatDefinition;
