import type { FormatDefinition } from '../format-definition';

export const formatSim = {
	id: 'sim',
	extensions: ['.sim']
} as const satisfies FormatDefinition;
