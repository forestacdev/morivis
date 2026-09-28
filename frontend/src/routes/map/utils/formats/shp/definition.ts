import type { FormatDefinition } from '../format-definition';

const files = {
	requiredExtensions: ['.shp', '.dbf', '.shx'],
	optionalExtensions: ['.prj', '.cpg'],
	grouping: 'same-path-stem'
} as const;

export const formatShp = {
	id: 'shp',
	extensions: [...files.requiredExtensions, ...files.optionalExtensions],
	limits: {},
	files
} as const satisfies FormatDefinition;
