import type { FormatDefinition } from '../format-definition';

export const formatSfc = {
	id: 'sfc',
	extensions: ['.sfc']
} as const satisfies FormatDefinition;
