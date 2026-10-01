import type { FormatDefinition } from '../format-definition';

export const formatDae = {
	id: 'dae',
	extensions: ['.dae']
} as const satisfies FormatDefinition;
