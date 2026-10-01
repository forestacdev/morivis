import type { FormatDefinition } from '../format-definition';

export const formatGpkg = {
	id: 'gpkg',
	extensions: ['.gpkg']
} as const satisfies FormatDefinition;
