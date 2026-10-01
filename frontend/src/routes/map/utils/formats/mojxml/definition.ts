import type { FormatDefinition } from '../format-definition';

export const formatMojxml = {
	id: 'mojxml',
	extensions: ['.xml']
} as const satisfies FormatDefinition;
