import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatMapinfoTab = {
	id: 'mapinfo-tab',
	extensions: ['.tab', '.dat', '.map', '.id', '.ind'],
	limits: {
		maxDatasetBytes: 256 * MiB,
		maxHeaderBytes: MiB,
		maxFeatures: 500_000,
		maxVertices: 5_000_000,
		timeoutMs: 120_000
	},
	files: {
		mainExtensions: ['.tab'],
		requiredExtensions: ['.map', '.id'],
		attributeExtensions: ['.dat', '.dbf'],
		optionalExtensions: ['.ind'],
		grouping: 'header-reference'
	}
} as const satisfies FormatDefinition;
