import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatMca = {
	id: 'mca',
	extensions: ['.mca'],
	limits: {
		maxFileBytes: 256 * MiB,
		maxNbtBytes: 32 * MiB,
		maxSections: 32_768,
		skipBatchWarning: true
	}
} as const satisfies FormatDefinition;
