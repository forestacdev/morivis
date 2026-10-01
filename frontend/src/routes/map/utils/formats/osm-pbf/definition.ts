import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatOsmPbf = {
	id: 'osm-pbf',
	extensions: ['.osm.pbf', '.pbf'],
	limits: {
		maxFileBytes: 64 * MiB,
		maxOutputBytes: 256 * MiB,
		maxFeatures: 1_000_000,
		maxSourcePoints: 5_000_000,
		maxVertices: 10_000_000,
		maxExpandedBytes: 512 * MiB,
		timeoutMs: 120_000
	}
} as const satisfies FormatDefinition;
