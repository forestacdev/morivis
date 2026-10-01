import type { FormatDefinition } from '../format-definition';

export const formatNc = {
	id: 'nc',
	extensions: ['.nc', '.nc4']
} as const satisfies FormatDefinition;
