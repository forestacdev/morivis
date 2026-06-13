import type { KmlParseResult } from './parse';
import { extractKmlFromKmz, extractGroundOverlayFromKmz, extractModelFromKmz } from './kmz';
import { parseKmlString } from './parse';
export { getKmlDefaultColor } from './styles';
export type {
	KmlGroundOverlayResult,
	KmzModelPlacement,
	KmzModelResult
} from './kmz';
export type { KmlParseResult } from './parse';

export const kmlFileToGeoJson = async (file: File): Promise<KmlParseResult> => {
	try {
		const ext = file.name.split('.').pop()?.toLowerCase();
		const text = ext === 'kmz' ? await extractKmlFromKmz(file) : await file.text();
		return await parseKmlString(text);
	} catch (error) {
		console.error('KML parsing error:', error);
		throw new Error('Failed to parse KML file');
	}
};

export { extractGroundOverlayFromKmz, extractModelFromKmz };
