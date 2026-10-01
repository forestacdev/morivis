import type { FormatDefinition } from '../format-definition';

export const formatRaster = {
	id: 'raster',
	extensions: ['.png', '.jpg', '.jpeg', '.webp'],
	limits: { skipBatchWarning: true }
} as const satisfies FormatDefinition;
