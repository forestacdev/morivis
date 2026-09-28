export const GEOJSON_SEQUENCE_EXTENSIONS = [
	'.geojsonl',
	'.jsonl',
	'.ndjson',
	'.geojsons',
	'.geojsonseq'
];

export const isGeoJsonSequenceFile = (name: string): boolean =>
	GEOJSON_SEQUENCE_EXTENSIONS.some(extension => name.toLowerCase().endsWith(extension));
