import { hasFormatExtension } from '../format-definition';
import { formatGeojsonseq } from './definition';

export const GEOJSON_SEQUENCE_EXTENSIONS = formatGeojsonseq.extensions;
export const isGeoJsonSequenceFile = (name: string): boolean =>
	hasFormatExtension(name, GEOJSON_SEQUENCE_EXTENSIONS);
