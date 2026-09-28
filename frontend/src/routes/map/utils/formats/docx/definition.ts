import type { FormatDefinition } from '../format-definition';

export const formatDocx = {
	id: 'docx',
	extensions: ['.docx']
} as const satisfies FormatDefinition;
