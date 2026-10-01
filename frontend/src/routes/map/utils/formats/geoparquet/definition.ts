import type { FormatDefinition } from '../format-definition';

export const formatParquet = {
	id: 'parquet',
	extensions: ['.parquet', '.geoparquet']
} as const satisfies FormatDefinition;
