import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatGeoZarr = {
	id: 'geozarr',
	extensions: [],
	limits: {
		maxVoxelsPerRegion: 250_000,
		maxVisibleVoxelRegions: 12,
		maxConcurrentVoxelReads: 2,
		maxSamples: 4 * 1024 * 1024,
		maxExpandedBytes: 64 * MiB,
		maxMetadataBytes: 8 * MiB,
		maxFileBytes: 256 * MiB,
		maxFiles: 100_000,
		skipBatchWarning: true
	}
} as const satisfies FormatDefinition;
