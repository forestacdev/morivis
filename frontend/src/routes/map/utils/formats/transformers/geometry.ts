import type Geometry from 'ol/geom/Geometry';
import type LineString from 'ol/geom/LineString';
import type MultiLineString from 'ol/geom/MultiLineString';
import type MultiPoint from 'ol/geom/MultiPoint';
import type MultiPolygon from 'ol/geom/MultiPolygon';
import type Point from 'ol/geom/Point';
import type Polygon from 'ol/geom/Polygon';
import type { AnyGeometry } from '$routes/map/types/geometry';

export const geometryToGeoJSON = (geometry: Geometry): AnyGeometry | null => {
	if (!geometry) return null;

	const type = geometry.getType();

	switch (type) {
		case 'Point': {
			const coords = (geometry as Point).getCoordinates();
			return { type: 'Point', coordinates: [coords[0], coords[1]] as [number, number] };
		}
		case 'MultiPoint': {
			const coords = (geometry as MultiPoint).getCoordinates();
			return {
				type: 'MultiPoint',
				coordinates: coords.map((c) => [c[0], c[1]] as [number, number])
			};
		}
		case 'LineString': {
			const coords = (geometry as LineString).getCoordinates();
			return {
				type: 'LineString',
				coordinates: coords.map((c) => [c[0], c[1]] as [number, number])
			};
		}
		case 'MultiLineString': {
			const coords = (geometry as MultiLineString).getCoordinates();
			return {
				type: 'MultiLineString',
				coordinates: coords.map((line) => line.map((c) => [c[0], c[1]] as [number, number]))
			};
		}
		case 'Polygon': {
			const coords = (geometry as Polygon).getCoordinates();
			return {
				type: 'Polygon',
				coordinates: coords.map((ring) => ring.map((c) => [c[0], c[1]] as [number, number]))
			};
		}
		case 'MultiPolygon': {
			const coords = (geometry as MultiPolygon).getCoordinates();
			return {
				type: 'MultiPolygon',
				coordinates: coords.map((poly) =>
					poly.map((ring) => ring.map((c) => [c[0], c[1]] as [number, number]))
				)
			};
		}
		default:
			console.warn(`Unsupported geometry type: ${type}`);
			return null;
	}
};
