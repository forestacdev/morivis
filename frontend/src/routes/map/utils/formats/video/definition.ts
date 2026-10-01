import type { FormatDefinition } from '../format-definition';

export const formatVideo = {
	id: 'video',
	extensions: ['.mp4', '.webm', '.mov', '.m4v', '.ogv']
} as const satisfies FormatDefinition;
