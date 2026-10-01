import type { FormatDefinition } from '../format-definition';

export const formatLandxml = {
	id: 'landxml',
	extensions: ['.landxml']
} as const satisfies FormatDefinition;
