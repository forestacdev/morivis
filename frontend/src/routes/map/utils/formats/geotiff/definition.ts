import type { FormatDefinition } from '../format-definition';

export const formatTif = {
	id: 'tif',
	extensions: ['.tif', '.tiff'],
	files: { optionalExtensions: ['.tfw', '.tifw', '.tiffw', '.wld', '.aux.xml'] }
} as const satisfies FormatDefinition;
