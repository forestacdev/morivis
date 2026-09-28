import type { FormatDefinition } from '../format-definition';

export const formatSvg = {
	id: 'svg',
	extensions: ['.svg']
} as const satisfies FormatDefinition;
