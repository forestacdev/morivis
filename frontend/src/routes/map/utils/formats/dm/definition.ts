import type { FormatDefinition } from '../format-definition';

export const formatDm = {
	id: 'dm',
	extensions: ['.dm', '.dmi']
} as const satisfies FormatDefinition;
