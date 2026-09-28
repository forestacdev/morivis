import type { FormatDefinition } from '../format-definition';

export const formatCitygml = {
	id: 'citygml',
	extensions: ['.citygml', '.gml', '.xml']
} as const satisfies FormatDefinition;
