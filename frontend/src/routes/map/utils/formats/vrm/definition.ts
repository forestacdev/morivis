import type { FormatDefinition } from '../format-definition';

export const formatVrm = {
	id: 'vrm',
	extensions: ['.vrm']
} as const satisfies FormatDefinition;
