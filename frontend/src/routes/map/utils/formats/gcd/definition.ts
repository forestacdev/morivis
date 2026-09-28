import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatGcd = {
	id: 'gcd',
	extensions: ['.gcd'],
	limits: {
		maxFileBytes: 128 * MiB,
		maxBatchBytes: 128 * MiB,
		maxFiles: 32,
		maxFeatures: 200_000,
		maxVertices: 2_000_000
	}
} as const satisfies FormatDefinition;
