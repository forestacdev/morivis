import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatFit = {
	id: 'fit',
	extensions: ['.fit'],
	limits: { maxFileBytes: 64 * MiB, timeoutMs: 120_000 }
} as const satisfies FormatDefinition;
