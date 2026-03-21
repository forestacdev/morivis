/**
 * KML / KMZ パーサー
 *
 * - KML仕様: https://developers.google.com/kml/documentation/kmlreference
 * - OpenLayers KML format: https://openlayers.org/en/latest/apidoc/module-ol_format_KML-KML.html
 */

import JSZip from 'jszip';
import KML from 'ol/format/KML.js';
import type { FeatureCollection } from '$routes/map/types/geojson';
import type { FeatureProp } from '$routes/map/types/properties';
import { geometryToGeoJSON } from '$routes/map/utils/file/gml';

const parseKmlString = (text: string): FeatureCollection => {
	const format = new KML({ extractStyles: false });
	const olFeatures = format.readFeatures(text);

	if (olFeatures.length === 0) {
		throw new Error('No features found in KML file');
	}

	const features = olFeatures
		.map((olFeature, index) => {
			const geometry = geometryToGeoJSON(olFeature.getGeometry()!);
			if (!geometry) return null;

			const properties = olFeature.getProperties();
			delete properties[olFeature.getGeometryName()];

			return {
				type: 'Feature' as const,
				id: olFeature.getId() ?? index,
				geometry,
				properties: properties as FeatureProp
			};
		})
		.filter((f): f is NonNullable<typeof f> => f !== null);

	return { type: 'FeatureCollection', features };
};

/**
 * KMZファイルからKML文字列を取り出す
 */
const extractKmlFromKmz = async (file: File): Promise<string> => {
	const zip = await JSZip.loadAsync(await file.arrayBuffer());
	const kmlFileName = Object.keys(zip.files).find((name) => name.endsWith('.kml'));

	if (!kmlFileName) {
		throw new Error('No KML file found in KMZ');
	}

	return zip.files[kmlFileName].async('string');
};

/**
 * KMLファイルをパースしてGeoJSONに変換する
 */
export const kmlFileToGeoJson = async (file: File): Promise<FeatureCollection> => {
	try {
		const ext = file.name.split('.').pop()?.toLowerCase();
		const text = ext === 'kmz' ? await extractKmlFromKmz(file) : await file.text();
		return parseKmlString(text);
	} catch (error) {
		console.error('KML parsing error:', error);
		throw new Error('Failed to parse KML file');
	}
};
