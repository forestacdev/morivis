import type { FormatDefinition } from '../format-definition';

export const formatDxf = {
	id: 'dxf',
	extensions: ['.dxf', '.dwg']
} as const satisfies FormatDefinition;
