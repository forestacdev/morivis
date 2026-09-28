import type { FormatDefinition } from '../format-definition';

export const formatGpx = {
	id: 'gpx',
	extensions: ['.gpx']
} as const satisfies FormatDefinition;
