import osmtogeojson from 'osmtogeojson';

import type { FeatureCollection } from '$routes/map/types/geojson';
import type { AnyGeometry } from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';

type OSMToGeoJSONFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry>;

export class OsmParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'OsmParseError';
	}
}

const parseOsmXml = (text: string): XMLDocument => {
	const parser = new DOMParser();
	const document = parser.parseFromString(text, 'text/xml');
	const parserError = document.querySelector('parsererror');

	if (parserError) {
		throw new OsmParseError('OSM XMLの構文が壊れています');
	}

	return document;
};

const normalizeFeatureCollection = (
	geojson: OSMToGeoJSONFeatureCollection
): FeatureCollection<AnyGeometry, FeatureProp> => ({
	type: 'FeatureCollection',
	features: geojson.features
		.filter((feature): feature is GeoJSON.Feature<GeoJSON.Geometry> => feature.geometry !== null)
		.map((feature) => ({
			type: 'Feature',
			id: feature.id != null ? String(feature.id) : undefined,
			geometry: feature.geometry as AnyGeometry,
			properties: ((feature.properties ?? {}) as Record<string, unknown>) as FeatureProp
		}))
});

export const osmFileToGeoJson = async (file: File): Promise<FeatureCollection> => {
	try {
		const text = await file.text();
		const xml = parseOsmXml(text);
		const geojson = osmtogeojson(xml, {
			flatProperties: true
		});
		const normalized = normalizeFeatureCollection(geojson);

		if (normalized.features.length === 0) {
			throw new OsmParseError('OSMファイルに描画可能なフィーチャが見つかりませんでした');
		}

		return normalized;
	} catch (error) {
		console.error('OSM parsing error:', error);

		if (error instanceof OsmParseError) {
			throw error;
		}

		throw new OsmParseError('OSMファイルの読み込みに失敗しました');
	}
};
