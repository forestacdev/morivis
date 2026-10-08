import { formatDwg } from '../dwg/definition';
import type { FormatDefinition } from '../format-definition';

export const formatDxf = {
	id: 'dxf',
	extensions: ['.dxf', ...formatDwg.extensions],
	variants: [formatDwg]
} as const satisfies FormatDefinition;
