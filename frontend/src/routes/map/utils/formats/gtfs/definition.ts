import type { FormatDefinition } from '../format-definition';

export const formatZip = {
	id: 'zip',
	extensions: ['.zip']
} as const satisfies FormatDefinition;
