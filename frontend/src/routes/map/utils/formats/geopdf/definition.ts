import type { FormatDefinition } from '../format-definition';

export const formatPdf = {
	id: 'pdf',
	extensions: ['.pdf']
} as const satisfies FormatDefinition;
