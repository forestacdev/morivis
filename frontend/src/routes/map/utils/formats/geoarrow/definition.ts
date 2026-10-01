import type { FormatDefinition } from '../format-definition';

export const formatGeoarrow = {
	id: 'geoarrow',
	extensions: ['.arrow', '.feather']
} as const satisfies FormatDefinition;
