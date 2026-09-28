import type { FormatDefinition } from '../format-definition';

export const formatStl = {
	id: 'stl',
	extensions: ['.stl']
} as const satisfies FormatDefinition;
