import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatAis = {
	id: 'ais',
	extensions: ['.ais', '.nmea', '.nme', '.log', '.txt'],
	limits: {
		maxFileBytes: 32 * MiB,
		maxTextLength: 32 * MiB,
		maxSourcePoints: 250_000,
		timeoutMs: 120_000
	}
} as const satisfies FormatDefinition;

export const aisLimits = {
	maxLineLength: 2048,
	maxPendingMessages: 1024,
	maxFragmentLineGap: 1000,
	maxVessels: 20_000,
	trackGapMs: 30 * 60 * 1000
} as const;
