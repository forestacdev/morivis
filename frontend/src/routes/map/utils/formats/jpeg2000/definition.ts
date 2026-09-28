import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatJpeg2000 = {
	id: 'jpeg2000',
	extensions: ['.jp2'],
	limits: {
		maxFileBytes: 256 * MiB,
		maxSamples: 16 * MiB,
		maxMetadataBytes: MiB,
		timeoutMs: 120_000
	},
	files: {
		mainExtensions: ['.jp2'],
		optionalExtensions: ['.j2w', '.jp2w', '.wld', '.prj', '.aux.xml'],
		grouping: 'same-path-stem'
	}
} as const satisfies FormatDefinition;
