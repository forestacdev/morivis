import type { FormatDefinition } from '../format-definition';

export const formatGeophoto = {
	id: 'geophoto',
	extensions: ['.png', '.jpg', '.jpeg', '.webp'],
	files: { optionalExtensions: ['.pgw', '.jgw', '.wld', '.aux.xml'] }
} as const satisfies FormatDefinition;
