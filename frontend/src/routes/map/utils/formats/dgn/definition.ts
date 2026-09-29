import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatDgn = {
	id: 'dgn',
	extensions: ['.dgn'],
	limits: {
		maxFileBytes: 64 * MiB,
		maxOutputBytes: 128 * MiB,
		maxFeatures: 500_000,
		maxVertices: 5_000_000,
		timeoutMs: 120_000
	}
} as const satisfies FormatDefinition;
