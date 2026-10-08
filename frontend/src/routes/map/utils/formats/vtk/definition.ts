import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatVtk = {
	id: 'vtk',
	extensions: ['.vtk', '.vtp', '.vtu', '.vti', '.vtr', '.vts'],
	limits: {
		maxFileBytes: 64 * MiB,
		maxExpandedBytes: 128 * MiB,
		maxOutputBytes: 192 * MiB,
		maxSourcePoints: 1_000_000,
		maxFeatures: 500_000,
		maxVertices: 6_000_000,
		timeoutMs: 120_000
	}
} as const satisfies FormatDefinition;
