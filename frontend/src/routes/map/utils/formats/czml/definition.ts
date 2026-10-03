import type { FormatDefinition } from '../format-definition';
import { MiB } from '../resource-limits';

export const formatCzml = {
	id: 'czml',
	extensions: ['.czml', '.json'],
	files: {
		mainExtensions: ['.czml', '.json'],
		optionalExtensions: ['.glb', '.gltf', '.bin', '.png', '.jpg', '.jpeg', '.webp'],
		grouping: 'header-reference'
	},
	limits: {
		maxFileBytes: 32 * MiB,
		maxTextLength: 32 * MiB,
		maxFeatures: 200_000,
		maxSourcePoints: 250_000,
		maxVertices: 1_000_000,
		maxSamples: 10_000,
		timeoutMs: 120_000
	}
} as const satisfies FormatDefinition;

export const czmlModelLimits = {
	maxInstances: 128,
	maxAssets: 32,
	maxBytes: 128 * MiB,
	maxVertices: 1_000_000
} as const;
