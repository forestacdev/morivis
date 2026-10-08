import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatDwg = {
	id: 'dwg',
	extensions: ['.dwg'],
	limits: {
		maxFileBytes: 128 * MiB
	}
} as const satisfies FormatDefinition;
