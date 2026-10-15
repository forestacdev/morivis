import type { FormatDefinition } from '../format-definition';

export const formatGif = {
	id: 'gif',
	extensions: ['.gif'],
	limits: {
		maxFileBytes: 32 * 1024 * 1024,
		maxSamples: 128 * 1024 * 1024,
		timeoutMs: 120_000
	}
} as const satisfies FormatDefinition;

export const GIF_MAX_DIMENSION = 4096;
