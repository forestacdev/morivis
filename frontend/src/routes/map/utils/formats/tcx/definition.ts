import type { FormatDefinition } from '../format-definition';

export const formatTcx = {
	id: 'tcx',
	extensions: ['.tcx']
} as const satisfies FormatDefinition;
