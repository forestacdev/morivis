import type { FormatDefinition } from '../format-definition';

export const formatAsciiGrid = {
	id: 'ascii-grid',
	extensions: ['.asc'],
	files: { mainExtensions: ['.asc'], optionalExtensions: ['.prj'], grouping: 'same-path-stem' }
} as const satisfies FormatDefinition;
