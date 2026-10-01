import type { FormatDefinition } from '../format-definition';

export const formatIfc = {
	id: 'ifc',
	extensions: ['.ifc']
} as const satisfies FormatDefinition;
