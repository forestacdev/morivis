import type { FeatureCollection } from '$routes/map/types/geojson';

import { SxfParseError } from './parse-error';
import { p21TextToGeoJson } from './p21';
import { sxfArrayBufferToGeoJson as sfcArrayBufferToGeoJson, sxfTextToGeoJson as sfcTextToGeoJson } from './sfc';
import { decodeSxfText, isP21Text } from './text';

export { SxfParseError } from './parse-error';

export const sxfTextToGeoJson = (text: string): FeatureCollection =>
	isP21Text(text) ? p21TextToGeoJson(text) : sfcTextToGeoJson(text);

export const sxfArrayBufferToGeoJson = (arrayBuffer: ArrayBuffer): FeatureCollection => {
	const text = decodeSxfText(arrayBuffer);
	if (isP21Text(text)) {
		return p21TextToGeoJson(text);
	}

	return sfcArrayBufferToGeoJson(arrayBuffer);
};
