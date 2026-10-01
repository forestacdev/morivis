import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatRik = {
	id: 'rik',
	extensions: ['.rik'],
	limits: { maxFileBytes: 256 * MiB, maxExpandedBytes: 512 * MiB, maxFiles: 4096 }
} as const satisfies FormatDefinition;
