import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatCedxm = {
	id: 'cedxm',
	extensions: ['.xml'],
	limits: { maxTextLength: 64 * MiB }
} as const satisfies FormatDefinition;
