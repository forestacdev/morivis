import type { FormatDefinition } from '../format-definition';

export const formatAmf = {
	id: 'amf',
	extensions: ['.amf']
} as const satisfies FormatDefinition;
