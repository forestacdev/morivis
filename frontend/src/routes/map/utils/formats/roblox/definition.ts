import type { FormatDefinition } from '../format-definition';

export const formatRoblox = {
	id: 'roblox',
	extensions: ['.rbxl', '.rbxlx']
} as const satisfies FormatDefinition;
