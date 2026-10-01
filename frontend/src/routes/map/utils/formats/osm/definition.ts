import type { FormatDefinition } from '../format-definition';
import { formatOsmPbf } from '../osm-pbf/definition';

export const formatOsm = {
	id: 'osm',
	extensions: ['.osm', ...formatOsmPbf.extensions],
	variants: [formatOsmPbf]
} as const satisfies FormatDefinition;
