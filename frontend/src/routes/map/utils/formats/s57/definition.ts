import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatS57 = {
	id: 's57',
	extensions: ['.000'],
	files: {
		mainExtensions: ['.000'],
		optionalExtensions: Array.from(
			{ length: 999 },
			(_, i) => `.${String(i + 1).padStart(3, '0')}`
		),
		grouping: 'same-path-stem'
	},
	limits: {
		maxFileBytes: 64 * MiB,
		maxDatasetBytes: 128 * MiB,
		maxFiles: 1000,
		maxOutputBytes: 128 * MiB,
		maxFeatures: 500_000,
		maxVertices: 5_000_000,
		maxSections: 1_000_000,
		timeoutMs: 120_000
	}
} as const satisfies FormatDefinition;
