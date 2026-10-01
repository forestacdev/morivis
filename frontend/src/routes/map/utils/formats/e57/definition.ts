import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatE57 = {
	id: 'e57',
	extensions: ['.e57'],
	limits: { maxFileBytes: 256 * MiB, maxSourcePoints: 5_000_000, maxDisplayPoints: 1_000_000 }
} as const satisfies FormatDefinition;
