import type { FormatDefinition } from '../format-definition';

export const formatGdb = {
	id: 'gdb',
	extensions: ['.gdb']
} as const satisfies FormatDefinition;
