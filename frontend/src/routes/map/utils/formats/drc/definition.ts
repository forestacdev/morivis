import type { FormatDefinition } from '../format-definition';

export const formatDrc = {
	id: 'drc',
	extensions: ['.drc']
} as const satisfies FormatDefinition;
