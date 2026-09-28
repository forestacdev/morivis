import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatOsmPbf = {
	id: 'osm-pbf',
	extensions: ['.osm.pbf', '.pbf'],
	limits: {
		maxFileBytes: 64 * MiB,
		maxOutputBytes: 128 * MiB,
		maxFeatures: 500_000,
		timeoutMs: 120_000
	}
} as const satisfies FormatDefinition;
