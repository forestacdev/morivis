import type { FormatDefinition } from '../format-definition';

export const formatGeorss = {
	id: 'georss',
	extensions: ['.georss', '.rss', '.atom']
} as const satisfies FormatDefinition;
