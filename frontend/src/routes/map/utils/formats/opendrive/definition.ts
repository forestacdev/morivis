import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatOpenDrive = {
	id: 'opendrive',
	extensions: ['.xodr'],
	limits: {
		maxFileBytes: 32 * MiB,
		maxTextLength: 32 * MiB,
		maxFeatures: 100_000,
		maxVertices: 2_000_000,
		maxSamples: 2_000_000,
		maxSections: 100_000,
		timeoutMs: 120_000
	}
} as const satisfies FormatDefinition;
