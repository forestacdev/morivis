import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { AnyGeometry, Geometry, GeometryCollection } from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';

type FeatureWithGeometryCollection = Omit<Feature<AnyGeometry>, 'geometry'> & {
	geometry: Geometry;
};

type FeatureCollectionWithGeometryCollection = {
	type: 'FeatureCollection';
	features: FeatureWithGeometryCollection[];
};

type SingleFeatureWithGeometryCollection = {
	type: 'Feature';
	id?: string | number;
	geometry: Geometry;
	properties?: FeatureProp | null;
};

export type RootGeoJsonWithGeometryCollection =
	| FeatureCollectionWithGeometryCollection
	| SingleFeatureWithGeometryCollection
	| Geometry;

const isGeometryCollection = (
	geometry: Geometry | null | undefined
): geometry is GeometryCollection => {
	return geometry?.type === 'GeometryCollection';
};

const toFeatureCollection = (
	geojson: RootGeoJsonWithGeometryCollection
): FeatureCollectionWithGeometryCollection => {
	if (geojson.type === 'FeatureCollection') {
		return geojson;
	}

	if (geojson.type === 'Feature') {
		return {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					id: geojson.id,
					geometry: geojson.geometry,
					properties: geojson.properties ?? {}
				}
			]
		};
	}

	return {
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				geometry: geojson,
				properties: {}
			}
		]
	};
};

export const normalizeGeoJsonGeometryCollections = (
	geojson: RootGeoJsonWithGeometryCollection
): FeatureCollection => {
	const featureCollection = toFeatureCollection(geojson);

	return {
		type: 'FeatureCollection',
		features: featureCollection.features.flatMap((feature): Feature[] => {
			if (!isGeometryCollection(feature.geometry)) {
				return [feature as Feature];
			}

			return feature.geometry.geometries.map(
				(geometry, index): Feature => ({
					...feature,
					id: feature.id != null
						? `${String(feature.id)}_${index}`
						: `${crypto.randomUUID()}_${index}`,
					geometry: geometry as AnyGeometry
				})
			);
		})
	};
};
