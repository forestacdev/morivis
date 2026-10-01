import type { FormatDefinition } from '../format-definition';

export const formatKml = {
	id: 'kml',
	extensions: ['.kml', '.kmz']
} as const satisfies FormatDefinition;
