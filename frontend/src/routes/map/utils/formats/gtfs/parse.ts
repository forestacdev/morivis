import type { Feature, FeatureCollection, Point, MultiLineString, Position } from 'geojson';
import type { GTFS } from './index';

// --- Stops ---

interface StopProperties {
	stop_id: string;
	stop_name: string;
	route_ids: string[];
	route_names: string[];
	route_name: string;
	route_color: string | null;
}

interface TimedStopProperties {
	stop_id: string;
	stop_name: string;
	route_id: string;
	route_name: string;
	route_color: string | null;
	trip_id: string;
	service_id: string;
	stop_sequence: number;
	arrival_time: string;
	departure_time: string;
	time: string;
	time_seconds: number;
}

const parseGtfsTimeToSeconds = (value: string): number | null => {
	const match = value.match(/^(\d{1,3}):(\d{2}):(\d{2})$/);
	if (!match) return null;

	const hours = parseInt(match[1], 10);
	const minutes = parseInt(match[2], 10);
	const seconds = parseInt(match[3], 10);

	if (minutes >= 60 || seconds >= 60) return null;

	return hours * 3600 + minutes * 60 + seconds;
};

const normalizeGtfsColor = (value: string | undefined): string | null => {
	if (!value) return null;
	const normalized = value.trim().replace(/^#/, '');
	if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
	return `#${normalized.toUpperCase()}`;
};

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
	const routeMap = new Map(gtfs.routes.map((route) => [route.route_id, route]));
	const routeNameMap = new Map(
		gtfs.routes.map((route) => [
			route.route_id,
			`${route.route_long_name ?? ''}${route.route_short_name ?? ''}`
		])
	);

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
		const orderedRouteIds = routeIds ? Array.from(routeIds).sort() : [];
		const routeNames = orderedRouteIds
			.map((routeId) => routeNameMap.get(routeId) ?? '')
			.filter((routeName) => routeName !== '');
		const representativeRouteName =
			routeNames.length === 0 ? '' : routeNames.length === 1 ? routeNames[0] : '複数路線';
		const representativeRouteColor =
			orderedRouteIds.length === 1
				? normalizeGtfsColor(routeMap.get(orderedRouteIds[0])?.route_color)
				: null;

		features.push({
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: [stop.stop_lon, stop.stop_lat]
			},
			properties: {
				stop_id: stop.stop_id,
				stop_name: stop.stop_name,
				route_ids: orderedRouteIds,
				route_names: routeNames,
				route_name: representativeRouteName,
				route_color: representativeRouteColor
			}
		});
	}

	return { type: 'FeatureCollection', features };
};

/**
 * stop_times を時間付きの停留所ポイントとして GeoJSON に変換する。
 * 時刻軸は departure_time を優先し、空なら arrival_time を使う。
 */
export const readTimedStops = (
	gtfs: GTFS
): FeatureCollection<Point, TimedStopProperties> => {
	const stopMap = new Map(gtfs.stops.map((stop) => [stop.stop_id, stop]));
	const tripMap = new Map(gtfs.trips.map((trip) => [trip.trip_id, trip]));
	const routeMap = new Map(gtfs.routes.map((route) => [route.route_id, route]));
	const routeNameMap = new Map(
		gtfs.routes.map((route) => [
			route.route_id,
			`${route.route_long_name ?? ''}${route.route_short_name ?? ''}`
		])
	);

	const features: Feature<Point, TimedStopProperties>[] = [];

	for (const stopTime of gtfs.stop_times) {
		const stop = stopMap.get(stopTime.stop_id);
		const trip = tripMap.get(stopTime.trip_id);
		if (!stop || !trip) continue;

		const rawTime =
			stopTime.departure_time?.trim() || stopTime.arrival_time?.trim() || '';
		const timeSeconds = parseGtfsTimeToSeconds(rawTime);
		if (!rawTime || timeSeconds == null) continue;

		features.push({
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: [stop.stop_lon, stop.stop_lat]
			},
			properties: {
				stop_id: stop.stop_id,
				stop_name: stop.stop_name,
				route_id: trip.route_id,
				route_name: routeNameMap.get(trip.route_id) ?? '',
				route_color: normalizeGtfsColor(routeMap.get(trip.route_id)?.route_color),
				trip_id: trip.trip_id,
				service_id: trip.service_id,
				stop_sequence: stopTime.stop_sequence,
				arrival_time: stopTime.arrival_time,
				departure_time: stopTime.departure_time,
				time: rawTime,
				time_seconds: timeSeconds
			}
		});
	}

	features.sort((left, right) => {
		const timeDelta = left.properties.time_seconds - right.properties.time_seconds;
		if (timeDelta !== 0) return timeDelta;

		const tripDelta = left.properties.trip_id.localeCompare(right.properties.trip_id);
		if (tripDelta !== 0) return tripDelta;

		return left.properties.stop_sequence - right.properties.stop_sequence;
	});

	return { type: 'FeatureCollection', features };
};

// --- Routes ---

interface RouteProperties {
	route_id: string | null;
	route_name: string;
	route_color: string | null;
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
	const routeColorMap = new Map<string, string | null>();
	for (const route of gtfs.routes) {
		routeNameMap.set(
			route.route_id,
			(route.route_long_name ?? '') + (route.route_short_name ?? '')
		);
		routeColorMap.set(route.route_id, normalizeGtfsColor(route.route_color));
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
				route_name: routeNameMap.get(routeId) ?? '',
				route_color: routeColorMap.get(routeId) ?? null
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
				route_name: shapeId,
				route_color: null
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
	const routeColorMap = new Map<string, string | null>();
	for (const route of gtfs.routes) {
		routeNameMap.set(
			route.route_id,
			(route.route_long_name ?? '') + (route.route_short_name ?? '')
		);
		routeColorMap.set(route.route_id, normalizeGtfsColor(route.route_color));
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
				route_name: routeNameMap.get(routeId) ?? '',
				route_color: routeColorMap.get(routeId) ?? null
			}
		});
	}

	return { type: 'FeatureCollection', features };
};
