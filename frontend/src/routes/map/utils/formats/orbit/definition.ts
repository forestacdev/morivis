import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatOrbit = {
	id: 'orbit',
	extensions: ['.tle', '.omm', '.txt', '.json'],
	limits: {
		maxFileBytes: 8 * MiB,
		maxTextLength: 8 * MiB,
		maxFeatures: 1000,
		maxSamples: 200_000,
		timeoutMs: 120_000
	}
} as const satisfies FormatDefinition;

export const orbitLimits = {
	maxDurationSeconds: 7 * 86400,
	minStepSeconds: 1,
	maxStepSeconds: 86400
} as const;
