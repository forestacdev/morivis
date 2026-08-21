/**
 * References:
 * - https://www.ogc.org/standards/gml/
 * - https://openlayers.org/en/latest/apidoc/module-ol_format_GML-GML.html
 */
import type { FeatureCollection } from '$routes/map/types/geojson';
import type { FeatureProp } from '$routes/map/types/properties';
import { geometryToGeoJSON } from '$routes/map/utils/formats/transformers/geometry';
import GML from 'ol/format/GML.js';
import GML2 from 'ol/format/GML2.js';

type GmlVersion = '2' | '3';

const detectGmlVersion = (text: string): GmlVersion => {
	if (text.includes('gml/3') || text.includes('GML/3')) return '3';
	if (text.includes('gml/2') || text.includes('GML/2')) return '2';
	return '3';
};

export const parseGenericGml = (text: string): FeatureCollection => {
	const version = detectGmlVersion(text);
	const format = version === '2' ? new GML2() : new GML();
	const olFeatures = format.readFeatures(text);

	if (olFeatures.length === 0) {
		throw new Error('No features found in GML file');
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
		.filter((feature): feature is NonNullable<typeof feature> => feature !== null);

	return { type: 'FeatureCollection', features };
};
