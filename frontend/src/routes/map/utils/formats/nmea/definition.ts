import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatNmea = {
	id: 'nmea',
	extensions: ['.nmea', '.nme', '.log', '.txt'],
	limits: {
		maxFileBytes: 32 * MiB,
		maxTextLength: 32 * MiB,
		maxSourcePoints: 250_000,
		timeoutMs: 120_000
	}
} as const satisfies FormatDefinition;
