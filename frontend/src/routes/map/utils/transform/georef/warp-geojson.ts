import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { AnyGeometry, GeometryCollection } from '$routes/map/types/geometry';

import { applyHomography, createHomography, type GeoRefCorners } from './homography';

const warpPoint = (
	coordinate: [number, number],
	sourceCorners: GeoRefCorners,
	targetCorners: GeoRefCorners
): [number, number] => applyHomography(coordinate, createHomography(sourceCorners, targetCorners));

const warpLine = (
	coordinates: [number, number][],
	sourceCorners: GeoRefCorners,
	targetCorners: GeoRefCorners
): [number, number][] =>
	coordinates.map((coordinate) => warpPoint(coordinate, sourceCorners, targetCorners));

const warpPolygon = (
	coordinates: [number, number][][],
	sourceCorners: GeoRefCorners,
	targetCorners: GeoRefCorners
): [number, number][][] => coordinates.map((ring) => warpLine(ring, sourceCorners, targetCorners));

const warpGeometry = (
	geometry: AnyGeometry | GeometryCollection,
	sourceCorners: GeoRefCorners,
	targetCorners: GeoRefCorners
): AnyGeometry | GeometryCollection => {
	switch (geometry.type) {
		case 'Point':
			return {
				...geometry,
				coordinates: warpPoint(geometry.coordinates, sourceCorners, targetCorners)
			};
		case 'MultiPoint':
		case 'LineString':
			return {
				...geometry,
				coordinates: warpLine(geometry.coordinates, sourceCorners, targetCorners)
			};
		case 'MultiLineString':
		case 'Polygon':
			return {
				...geometry,
				coordinates: warpPolygon(geometry.coordinates, sourceCorners, targetCorners)
			};
		case 'MultiPolygon':
			return {
				...geometry,
				coordinates: geometry.coordinates.map((polygon) =>
					warpPolygon(polygon, sourceCorners, targetCorners)
				)
			};
		case 'GeometryCollection':
			return {
				...geometry,
				geometries: geometry.geometries.map((child) =>
					warpGeometry(child, sourceCorners, targetCorners)
				)
			} as GeometryCollection;
	}
};

export const warpGeoJSONByCorners = (
	featureCollection: FeatureCollection,
	sourceCorners: GeoRefCorners,
	targetCorners: GeoRefCorners
): FeatureCollection => ({
	type: 'FeatureCollection',
	features: featureCollection.features.map((feature) => {
		if (!feature.geometry) return feature;

		return {
			...feature,
			geometry: warpGeometry(feature.geometry, sourceCorners, targetCorners)
		} as Feature;
	})
});
