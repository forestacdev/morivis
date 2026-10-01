import type { FormatDefinition } from '../format-definition';

export const formatPmx = {
	id: 'pmx',
	extensions: ['.pmx'],
	files: { optionalExtensions: ['.spa', '.sph', '.vmd', '.vpd'], grouping: 'header-reference' }
} as const satisfies FormatDefinition;
