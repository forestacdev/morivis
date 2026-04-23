import type { Feature, FeatureCollection, Point, MultiLineString, Position } from 'geojson';
import type { GTFS } from './index';

// --- Stops ---

interface StopProperties {
	stop_id: string;
	stop_name: string;
	route_ids: string[];
}

/**
 * 停留所をGeoJSON FeatureCollectionに変換する。
 */
export const readStops = (
	gtfs: GTFS,
	options: { ignoreNoRoute?: boolean } = {}
): FeatureCollection<Point, StopProperties> => {
	// trip_id → route_id の高速ルックアップ
	const tripRouteMap = new Map<string, string>();
	for (const trip of gtfs.trips) {
		tripRouteMap.set(trip.trip_id, trip.route_id);
	}

	// stop_id → route_id[] のマッピング
	const stopRouteMap = new Map<string, Set<string>>();
	for (const st of gtfs.stop_times) {
		const routeId = tripRouteMap.get(st.trip_id);
		if (!routeId) continue;
		if (!stopRouteMap.has(st.stop_id)) {
			stopRouteMap.set(st.stop_id, new Set());
		}
		stopRouteMap.get(st.stop_id)!.add(routeId);
	}

	const features: Feature<Point, StopProperties>[] = [];

	for (const stop of gtfs.stops) {
		const routeIds = stopRouteMap.get(stop.stop_id);
		if (options.ignoreNoRoute && !routeIds) continue;

		features.push({
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: [stop.stop_lon, stop.stop_lat]
			},
			properties: {
				stop_id: stop.stop_id,
				stop_name: stop.stop_name,
				route_ids: routeIds ? Array.from(routeIds) : []
			}
		});
	}

	return { type: 'FeatureCollection', features };
};

// --- Routes ---

interface RouteProperties {
	route_id: string | null;
	route_name: string;
}

/**
 * ルートをGeoJSON FeatureCollectionに変換する。
 * shapesがあればshapesから、なければstop_timesから路線形状を構築する。
 */
export const readRoutes = (
	gtfs: GTFS,
	options: { ignoreShapes?: boolean } = {}
): FeatureCollection<MultiLineString, RouteProperties> => {
	if (gtfs.shapes && !options.ignoreShapes) {
		return readRouteShapes(gtfs);
	}
	return readRoutesFromStopTimes(gtfs);
};

/**
 * shapes.txtからルート形状を構築
 */
const readRouteShapes = (gtfs: GTFS): FeatureCollection<MultiLineString, RouteProperties> => {
	const shapes = gtfs.shapes!;

	// shape_id → coordinates（shape_pt_sequenceでソート済み）
	const shapeLines = new Map<string, Position[]>();
	const sorted = [...shapes].sort(
		(a, b) => a.shape_id.localeCompare(b.shape_id) || a.shape_pt_sequence - b.shape_pt_sequence
	);
	for (const pt of sorted) {
		if (!shapeLines.has(pt.shape_id)) {
			shapeLines.set(pt.shape_id, []);
		}
		shapeLines.get(pt.shape_id)!.push([pt.shape_pt_lon, pt.shape_pt_lat]);
	}

	// route_id → shape_id[] のマッピング（trips経由）
	const routeShapes = new Map<string, Set<string>>();
	const usedShapeIds = new Set<string>();
	for (const trip of gtfs.trips) {
		if (!trip.shape_id) continue;
		if (!routeShapes.has(trip.route_id)) {
			routeShapes.set(trip.route_id, new Set());
		}
		routeShapes.get(trip.route_id)!.add(trip.shape_id);
		usedShapeIds.add(trip.shape_id);
	}

	// route_id → route_name
	const routeNameMap = new Map<string, string>();
	for (const route of gtfs.routes) {
		routeNameMap.set(
			route.route_id,
			(route.route_long_name ?? '') + (route.route_short_name ?? '')
		);
	}

	// route_id → MultiLineString
	const features: Feature<MultiLineString, RouteProperties>[] = [];

	for (const [routeId, shapeIds] of routeShapes) {
		const coordinates: Position[][] = [];
		for (const shapeId of shapeIds) {
			const line = shapeLines.get(shapeId);
			if (line) coordinates.push(line);
		}
		if (coordinates.length === 0) continue;

		features.push({
			type: 'Feature',
			geometry: { type: 'MultiLineString', coordinates },
			properties: {
				route_id: routeId,
				route_name: routeNameMap.get(routeId) ?? ''
			}
		});
	}

	// routeに紐づかないshapesも出力
	for (const [shapeId, line] of shapeLines) {
		if (usedShapeIds.has(shapeId)) continue;
		features.push({
			type: 'Feature',
			geometry: { type: 'MultiLineString', coordinates: [line] },
			properties: {
				route_id: null,
				route_name: shapeId
			}
		});
	}

	return { type: 'FeatureCollection', features };
};

/**
 * stop_timesからルート形状を構築（shapesがない場合）
 */
const readRoutesFromStopTimes = (
	gtfs: GTFS
): FeatureCollection<MultiLineString, RouteProperties> => {
	// stop_id → coordinates
	const stopCoords = new Map<string, Position>();
	for (const stop of gtfs.stops) {
		stopCoords.set(stop.stop_id, [stop.stop_lon, stop.stop_lat]);
	}

	// trip_id → route_id
	const tripRouteMap = new Map<string, string>();
	for (const trip of gtfs.trips) {
		tripRouteMap.set(trip.trip_id, trip.route_id);
	}

	// trip_id → stop_ids（stop_sequenceでソート済み）
	const tripStops = new Map<string, string[]>();
	const sortedStopTimes = [...gtfs.stop_times].sort(
		(a, b) => a.trip_id.localeCompare(b.trip_id) || a.stop_sequence - b.stop_sequence
	);
	for (const st of sortedStopTimes) {
		if (!tripStops.has(st.trip_id)) {
			tripStops.set(st.trip_id, []);
		}
		tripStops.get(st.trip_id)!.push(st.stop_id);
	}

	// route_id → 固有のstop_pattern → coordinates
	const routePatterns = new Map<string, Map<string, Position[]>>();
	for (const [tripId, stopIds] of tripStops) {
		const routeId = tripRouteMap.get(tripId);
		if (!routeId) continue;
		const patternKey = stopIds.join(',');
		if (!routePatterns.has(routeId)) {
			routePatterns.set(routeId, new Map());
		}
		if (!routePatterns.get(routeId)!.has(patternKey)) {
			const coords = stopIds
				.map((sid) => stopCoords.get(sid))
				.filter((c): c is Position => c !== undefined);
			routePatterns.get(routeId)!.set(patternKey, coords);
		}
	}

	// route_id → route_name
	const routeNameMap = new Map<string, string>();
	for (const route of gtfs.routes) {
		routeNameMap.set(
			route.route_id,
			(route.route_long_name ?? '') + (route.route_short_name ?? '')
		);
	}

	const features: Feature<MultiLineString, RouteProperties>[] = [];

	for (const [routeId, patterns] of routePatterns) {
		const coordinates: Position[][] = Array.from(patterns.values());
		if (coordinates.length === 0) continue;

		features.push({
			type: 'Feature',
			geometry: { type: 'MultiLineString', coordinates },
			properties: {
				route_id: routeId,
				route_name: routeNameMap.get(routeId) ?? ''
			}
		});
	}

	return { type: 'FeatureCollection', features };
};
