import type { FormatDefinition } from '../format-definition';

export const formatBz2 = {
	id: 'bz2',
	extensions: ['.bz2', '.lrit', '.hrit']
} as const satisfies FormatDefinition;
