import type { FormatDefinition } from '../format-definition';

export const formatH5 = {
	id: 'h5',
	extensions: ['.h5']
} as const satisfies FormatDefinition;
