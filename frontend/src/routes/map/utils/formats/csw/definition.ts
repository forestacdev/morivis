import type { FormatDefinition } from '../format-definition';

export const formatCsw = {
	id: 'csw',
	extensions: [],
	limits: { maxMetadataBytes: 5 * 1024 * 1024, maxFeatures: 100, timeoutMs: 20000 }
} as const satisfies FormatDefinition;
