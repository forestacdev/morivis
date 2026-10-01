import type { FormatDefinition } from '../format-definition';

export const formatGlb = {
	id: 'glb',
	extensions: ['.glb', '.gltf']
} as const satisfies FormatDefinition;
