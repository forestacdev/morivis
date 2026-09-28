import type { FormatDefinition } from '../format-definition';

export const formatUsd = {
	id: 'usd',
	extensions: ['.usd', '.usda', '.usdz']
} as const satisfies FormatDefinition;
