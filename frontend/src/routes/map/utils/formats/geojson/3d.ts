import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
import type { FeatureCollection } from '$routes/map/types/geojson';
import type { AnyGeometry, GeometryCollection } from '$routes/map/types/geometry';

const isCoordinateTuple = (value: unknown): value is number[] =>
	Array.isArray(value) &&
	value.length >= 2 &&
	value.every((item) => typeof item === 'number' && Number.isFinite(item));

const coordinatesContainZ = (coordinates: unknown): boolean => {
	if (isCoordinateTuple(coordinates)) {
		return coordinates.length >= 3;
	}

	if (!Array.isArray(coordinates)) {
		return false;
	}

	return coordinates.some((coordinate) => coordinatesContainZ(coordinate));
};

const geometryMatchesType = (
	geometry: AnyGeometry | GeometryCollection | null | undefined,
	geometryType: VectorEntryGeometryType
): boolean => {
	if (!geometry) return false;

	if (geometry.type === geometryType) return true;
	if (geometryType === 'Point' && geometry.type === 'MultiPoint') return true;
	if (geometryType === 'LineString' && geometry.type === 'MultiLineString') return true;
	if (geometryType === 'Polygon' && geometry.type === 'MultiPolygon') return true;

	if (geometry.type === 'GeometryCollection') {
		return geometry.geometries.some((child) => geometryMatchesType(child, geometryType));
	}

	return false;
};

const geometryHasZForType = (
	geometry: AnyGeometry | GeometryCollection | null | undefined,
	geometryType: VectorEntryGeometryType
): boolean => {
	if (!geometry) return false;

	if (geometry.type === 'GeometryCollection') {
		return geometry.geometries.some((child) => geometryHasZForType(child, geometryType));
	}

	if (!geometryMatchesType(geometry, geometryType)) {
		return false;
	}

	return coordinatesContainZ(geometry.coordinates);
};

export const has3dGeometryForType = (
	geojson: FeatureCollection,
	geometryType: VectorEntryGeometryType
): boolean =>
	geojson.features.some((feature) => geometryHasZForType(feature.geometry, geometryType));

export const canRender3dGeoJsonWithDeck = (geometryType: VectorEntryGeometryType): boolean =>
	geometryType === 'Point' || geometryType === 'LineString' || geometryType === 'Polygon';
