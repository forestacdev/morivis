import type { FormatDefinition } from '../format-definition';

export const formatFbx = {
	id: 'fbx',
	extensions: ['.fbx']
} as const satisfies FormatDefinition;
