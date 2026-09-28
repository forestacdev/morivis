import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatBds = {
	id: 'bds',
	extensions: ['.bds'],
	limits: { maxFileBytes: 32 * MiB, maxBatchBytes: 32 * MiB, maxFiles: 32, maxFeatures: 500_000 }
} as const satisfies FormatDefinition;
