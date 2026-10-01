import { MercatorCoordinate } from '$routes/map/utils/maplibre';

import type { GeoRefCorners } from './homography';

type Point = [number, number];

/** Translate in the map plane so rotated/projective shapes keep their size and angles. */
export const translateGeoRefCorners = (
	corners: GeoRefCorners,
	start: Point,
	end: Point
): GeoRefCorners => {
	if (![...corners.flat(), ...start, ...end].every(Number.isFinite)) return corners;
	const points = corners.map((point) => MercatorCoordinate.fromLngLat(point));
	const from = MercatorCoordinate.fromLngLat(start);
	const to = MercatorCoordinate.fromLngLat(end);
	if (
		![...points, from, to].every((point) =>
			Number.isFinite(point.x) && Number.isFinite(point.y)
		)
	) return corners;
	// Clamp the common offset, not individual corners, to avoid distorting the image at world edges.
	const dx = Math.max(
		-Math.min(...points.map((p) => p.x)),
		Math.min(1 - Math.max(...points.map((p) => p.x)), to.x - from.x)
	);
	const dy = Math.max(
		-Math.min(...points.map((p) => p.y)),
		Math.min(1 - Math.max(...points.map((p) => p.y)), to.y - from.y)
	);
	return points.map((point) => {
		const result = new MercatorCoordinate(point.x + dx, point.y + dy).toLngLat();
		return [result.lng, result.lat];
	}) as GeoRefCorners;
};

/** Hit-test the actual projected quadrilateral, including rotated/free-transformed previews. */
export const isInsideGeoRefImage = (point: Point, corners: GeoRefCorners): boolean => {
	if (![...point, ...corners.flat()].every(Number.isFinite)) return false;
	let inside = false;
	for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
		const [xi, yi] = corners[i];
		const [xj, yj] = corners[j];
		if (
			(yi > point[1]) !== (yj > point[1])
			&& point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi
		) inside = !inside;
	}
	return inside;
};
