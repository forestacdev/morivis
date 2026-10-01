import type { FormatDefinition } from '../format-definition';

export const formatMif = {
	id: 'mif',
	extensions: ['.mif', '.mid']
} as const satisfies FormatDefinition;
