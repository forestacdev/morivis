import type { FormatDefinition } from '../format-definition';

export const formatGeojsonseq = {
	id: 'geojsonseq',
	extensions: ['.geojsonl', '.jsonl', '.ndjson', '.geojsons', '.geojsonseq']
} as const satisfies FormatDefinition;
