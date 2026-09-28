import type { FormatDefinition } from '../format-definition';

export const formatGml = {
	id: 'gml',
	extensions: ['.gml', '.xml']
} as const satisfies FormatDefinition;
