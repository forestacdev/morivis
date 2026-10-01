import type { FormatDefinition } from '../format-definition';

export const formatVrml = {
	id: 'vrml',
	extensions: ['.wrl', '.vrml']
} as const satisfies FormatDefinition;
