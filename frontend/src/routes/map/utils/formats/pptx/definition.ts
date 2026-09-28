import type { FormatDefinition } from '../format-definition';

export const formatPptx = {
	id: 'pptx',
	extensions: ['.pptx']
} as const satisfies FormatDefinition;
