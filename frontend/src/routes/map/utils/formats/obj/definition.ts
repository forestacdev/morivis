import type { FormatDefinition } from '../format-definition';

export const formatObj = {
	id: 'obj',
	extensions: ['.obj'],
	files: {
		optionalExtensions: ['.mtl', '.bmp', '.dds', '.gif', '.tga'],
		grouping: 'header-reference'
	}
} as const satisfies FormatDefinition;
