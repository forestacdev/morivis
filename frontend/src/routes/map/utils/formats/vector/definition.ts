import type { FormatDefinition } from '../format-definition';

export const formatVector = {
	id: 'vector',
	extensions: ['.mvt', '.pbf', '.mvt.gz', '.pbf.gz', '.mlt', '.mlt.gz'],
	limits: { skipBatchWarning: true }
} as const satisfies FormatDefinition;
