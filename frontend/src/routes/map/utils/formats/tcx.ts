import { XMLParser } from 'fast-xml-parser';

import type { FeatureCollection } from '$routes/map/types/geojson';
import type { LineStringGeometry, PointGeometry } from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';

type TcxNode = Record<string, unknown>;

type TcxTrackPoint = {
	lat: number;
	lon: number;
	ele?: number;
	time?: string;
	distanceMeters?: number;
	heartRateBpm?: number;
	cadence?: number;
	watts?: number;
	speed?: number;
};

type TcxTrack = {
	kind: 'activity' | 'course' | 'history';
	name: string;
	sport?: string;
	activityId?: string;
	courseName?: string;
	lapIndex?: number;
	trackIndex: number;
	startTime?: string;
	totalTimeSeconds?: number;
	distanceMeters?: number;
	calories?: number;
	intensity?: string;
	triggerMethod?: string;
	points: TcxTrackPoint[];
};

type TcxWaypoint = {
	kind: 'lap' | 'course_point';
	name: string;
	lat: number;
	lon: number;
	time?: string;
	ele?: number;
	pointType?: string;
	notes?: string;
	distanceMeters?: number;
	sport?: string;
	activityId?: string;
	courseName?: string;
	lapIndex?: number;
};

export type TcxDataType = 'tracks' | 'track_points' | 'waypoints';

export type TcxParseResult = {
	tracks: TcxTrack[];
	waypoints: TcxWaypoint[];
};

const tcxParser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '',
	removeNSPrefix: true,
	parseTagValue: false,
	parseAttributeValue: false,
	trimValues: true
});

const asArray = <T>(value: T | T[] | undefined | null): T[] => {
	if (value == null) return [];
	return Array.isArray(value) ? value : [value];
};

const asNode = (value: unknown): TcxNode | null => {
	return value && typeof value === 'object' && !Array.isArray(value) ? (value as TcxNode) : null;
};

const getText = (value: unknown): string | undefined => {
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed === '' ? undefined : trimmed;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	return undefined;
};

const getNumber = (value: unknown): number | undefined => {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === 'string') {
		const normalized = value.trim();
		if (normalized === '') return undefined;
		const parsed = Number(normalized);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
};

const formatTcxTime = (value: unknown): string | undefined => {
	const raw = getText(value);
	if (!raw) return undefined;

	const date = new Date(raw);
	if (Number.isNaN(date.getTime())) {
		return raw;
	}

	const jstTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
	const year = jstTime.getUTCFullYear();
	const month = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
	const day = String(jstTime.getUTCDate()).padStart(2, '0');
	const hours = String(jstTime.getUTCHours()).padStart(2, '0');
	const minutes = String(jstTime.getUTCMinutes()).padStart(2, '0');
	const seconds = String(jstTime.getUTCSeconds()).padStart(2, '0');

	return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
};

const getNestedValue = (value: unknown, path: string[]): unknown => {
	let current: unknown = value;
	for (const key of path) {
		const node = asNode(current);
		if (!node) return undefined;
		current = node[key];
	}
	return current;
};

const findFirstByKeys = (value: unknown, keys: string[]): unknown => {
	const node = asNode(value);
	if (!node) return undefined;

	for (const key of keys) {
		if (key in node) {
			return node[key];
		}
	}

	for (const child of Object.values(node)) {
		if (Array.isArray(child)) {
			for (const item of child) {
				const found = findFirstByKeys(item, keys);
				if (found !== undefined) return found;
			}
			continue;
		}

		const found = findFirstByKeys(child, keys);
		if (found !== undefined) return found;
	}

	return undefined;
};

const getTrackPointAngle = (
	points: Array<{ lat: number; lon: number }>,
	pointIndex: number
): number | undefined => {
	const currentPoint = points[pointIndex];
	const nextPoint = points[pointIndex + 1];
	const previousPoint = points[pointIndex - 1];

	const toRadians = (value: number) => (value * Math.PI) / 180;
	const toDegrees = (value: number) => (value * 180) / Math.PI;
	const getBearing = (from: { lat: number; lon: number }, to: { lat: number; lon: number }) => {
		const fromLat = toRadians(from.lat);
		const toLat = toRadians(to.lat);
		const deltaLon = toRadians(to.lon - from.lon);
		const y = Math.sin(deltaLon) * Math.cos(toLat);
		const x =
			Math.cos(fromLat) * Math.sin(toLat) -
			Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon);
		return (toDegrees(Math.atan2(y, x)) + 360) % 360;
	};

	if (currentPoint && nextPoint) {
		return getBearing(currentPoint, nextPoint);
	}
	if (previousPoint && currentPoint) {
		return getBearing(previousPoint, currentPoint);
	}
	return undefined;
};

const parseTrackPoint = (value: unknown): TcxTrackPoint | null => {
	const node = asNode(value);
	if (!node) return null;

	const lat = getNumber(getNestedValue(node, ['Position', 'LatitudeDegrees']));
	const lon = getNumber(getNestedValue(node, ['Position', 'LongitudeDegrees']));
	if (lat == null || lon == null) {
		return null;
	}

	return {
		lat,
		lon,
		ele: getNumber(node.AltitudeMeters),
		time: formatTcxTime(node.Time),
		distanceMeters: getNumber(node.DistanceMeters),
		heartRateBpm: getNumber(getNestedValue(node, ['HeartRateBpm', 'Value']) ?? node.HeartRateBpm),
		cadence: getNumber(node.Cadence),
		watts: getNumber(findFirstByKeys(node.Extensions, ['Watts'])),
		speed: getNumber(findFirstByKeys(node.Extensions, ['Speed']))
	};
};

const parseLapWaypoints = (
	track: TcxTrack,
	waypoints: TcxWaypoint[],
	lapWaypointIndex: number
): number => {
	const firstPoint = track.points[0];
	if (!firstPoint) return lapWaypointIndex;

	waypoints.push({
		kind: 'lap',
		name: `LAP${String(lapWaypointIndex + 1).padStart(3, '0')}`,
		lat: firstPoint.lat,
		lon: firstPoint.lon,
		time: firstPoint.time ?? track.startTime,
		ele: firstPoint.ele,
		distanceMeters: track.distanceMeters,
		sport: track.sport,
		activityId: track.activityId,
		lapIndex: track.lapIndex
	});

	return lapWaypointIndex + 1;
};

const parseActivityContainer = (
	activity: TcxNode,
	tracks: TcxTrack[],
	waypoints: TcxWaypoint[],
	kind: 'activity' | 'history'
): void => {
	const activityId = getText(activity.Id) ?? getText(activity.Name) ?? `${kind}-${tracks.length + 1}`;
	const sport = getText(activity.Sport);
	const laps = asArray(activity.Lap ?? getNestedValue(activity, ['Laps', 'Lap']));
	let lapWaypointIndex = waypoints.filter((waypoint) => waypoint.kind === 'lap').length;

	laps.forEach((lapValue, lapIndex) => {
		const lap = asNode(lapValue);
		if (!lap) return;

		asArray(lap.Track).forEach((trackValue, trackIndex) => {
			const trackNode = asNode(trackValue);
			if (!trackNode) return;

			const points = asArray(trackNode.Trackpoint).map(parseTrackPoint).filter(Boolean) as TcxTrackPoint[];
			if (points.length === 0) return;

			const parsedTrack: TcxTrack = {
				kind,
				name: activityId,
				sport,
				activityId,
				lapIndex,
				trackIndex,
				startTime: formatTcxTime(lap.StartTime),
				totalTimeSeconds: getNumber(lap.TotalTimeSeconds),
				distanceMeters: getNumber(lap.DistanceMeters),
				calories: getNumber(lap.Calories),
				intensity: getText(lap.Intensity),
				triggerMethod: getText(lap.TriggerMethod),
				points
			};

			tracks.push(parsedTrack);
			lapWaypointIndex = parseLapWaypoints(parsedTrack, waypoints, lapWaypointIndex);
		});
	});
};

const parseCourseContainer = (course: TcxNode, tracks: TcxTrack[], waypoints: TcxWaypoint[]) => {
	const courseName = getText(course.Name) ?? `course-${tracks.length + 1}`;

	asArray(course.Track).forEach((trackValue, trackIndex) => {
		const trackNode = asNode(trackValue);
		if (!trackNode) return;

		const points = asArray(trackNode.Trackpoint).map(parseTrackPoint).filter(Boolean) as TcxTrackPoint[];
		if (points.length === 0) return;

		tracks.push({
			kind: 'course',
			name: courseName,
			courseName,
			trackIndex,
			points
		});
	});

	asArray(course.CoursePoint).forEach((coursePointValue, coursePointIndex) => {
		const coursePoint = asNode(coursePointValue);
		if (!coursePoint) return;

		const lat = getNumber(getNestedValue(coursePoint, ['Position', 'LatitudeDegrees']));
		const lon = getNumber(getNestedValue(coursePoint, ['Position', 'LongitudeDegrees']));
		if (lat == null || lon == null) return;

		waypoints.push({
			kind: 'course_point',
			name: getText(coursePoint.Name) ?? `CoursePoint ${coursePointIndex + 1}`,
			lat,
			lon,
			time: formatTcxTime(coursePoint.Time),
			pointType: getText(coursePoint.PointType),
			notes: getText(coursePoint.Notes),
			distanceMeters: getNumber(coursePoint.DistanceMeters),
			courseName
		});
	});
};

const parseTcxTextInternal = (text: string): TcxParseResult => {
	const parsed = tcxParser.parse(text) as TcxNode;
	const root = asNode(parsed.TrainingCenterDatabase ?? parsed);
	if (!root || !(parsed.TrainingCenterDatabase || parsed['TrainingCenterDatabase'])) {
		throw new Error('TrainingCenterDatabase が見つかりません');
	}

	const tracks: TcxTrack[] = [];
	const waypoints: TcxWaypoint[] = [];

	asArray(getNestedValue(root, ['Activities', 'Activity'])).forEach((activityValue) => {
		const activity = asNode(activityValue);
		if (activity) parseActivityContainer(activity, tracks, waypoints, 'activity');
	});

	asArray(getNestedValue(root, ['History', 'Run'])).forEach((runValue) => {
		const run = asNode(runValue);
		if (run) parseActivityContainer(run, tracks, waypoints, 'history');
	});

	asArray(getNestedValue(root, ['Courses', 'Course'])).forEach((courseValue) => {
		const course = asNode(courseValue);
		if (course) parseCourseContainer(course, tracks, waypoints);
	});

	return { tracks, waypoints };
};

export const readTcxFile = async (file: File): Promise<TcxParseResult> => {
	const text = await file.text();
	return parseTcxTextInternal(text);
};

export const parseTcxText = (text: string): TcxParseResult => {
	return parseTcxTextInternal(text);
};

export const checkTcxFile = async (
	file: File
): Promise<{ tracks: boolean; track_points: boolean; waypoints: boolean }> => {
	const parsed = await readTcxFile(file);
	return {
		tracks: parsed.tracks.some((track) => track.points.length >= 2),
		track_points: parsed.tracks.some((track) => track.points.length > 0),
		waypoints: parsed.waypoints.length > 0
	};
};

export const tcxFileToGeojson = async (file: File, type: TcxDataType): Promise<FeatureCollection> => {
	const parsed = await readTcxFile(file);

	if (type === 'tracks') {
		const geojson: FeatureCollection<LineStringGeometry> = {
			type: 'FeatureCollection',
			features: parsed.tracks
				.filter((track) => track.points.length >= 2)
				.map((track) => ({
					type: 'Feature',
					geometry: {
						type: 'LineString',
						coordinates: track.points.map((point) => [point.lon, point.lat] as [number, number])
					},
					properties: {
						name: track.name,
						kind: track.kind,
						sport: track.sport,
						activity_id: track.activityId,
						course_name: track.courseName,
						lap_index: track.lapIndex,
						track_index: track.trackIndex,
						time: track.points[0]?.time ?? track.startTime,
						total_time_seconds: track.totalTimeSeconds,
						distance_meters: track.distanceMeters,
						calories: track.calories,
						intensity: track.intensity,
						trigger_method: track.triggerMethod,
						point_count: track.points.length,
						source_format: 'tcx'
					} as FeatureProp
				}))
		};

		return geojson;
	}

	if (type === 'track_points') {
		const geojson: FeatureCollection<PointGeometry> = {
			type: 'FeatureCollection',
			features: parsed.tracks.flatMap((track, trackIndex) =>
				track.points.map((point, pointIndex) => ({
					type: 'Feature' as const,
					geometry: {
						type: 'Point' as const,
						coordinates: [point.lon, point.lat] as [number, number]
					},
					properties: {
						name: track.name,
						kind: track.kind,
						sport: track.sport,
						activity_id: track.activityId,
						course_name: track.courseName,
						lap_index: track.lapIndex,
						track_index: trackIndex,
						point_index: pointIndex,
						lat: point.lat,
						lon: point.lon,
						ele: point.ele,
						time: point.time,
						distance_meters: point.distanceMeters,
						heart_rate_bpm: point.heartRateBpm,
						cadence: point.cadence,
						watts: point.watts,
						speed: point.speed,
						angle: getTrackPointAngle(track.points, pointIndex),
						source_format: 'tcx'
					} as FeatureProp
				}))
			)
		};

		return geojson;
	}

	const geojson: FeatureCollection<PointGeometry> = {
		type: 'FeatureCollection',
		features: parsed.waypoints.map((waypoint) => ({
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: [waypoint.lon, waypoint.lat] as [number, number]
			},
			properties: {
				name: waypoint.name,
				kind: waypoint.kind,
				time: waypoint.time,
				ele: waypoint.ele,
				point_type: waypoint.pointType,
				notes: waypoint.notes,
				distance_meters: waypoint.distanceMeters,
				sport: waypoint.sport,
				activity_id: waypoint.activityId,
				course_name: waypoint.courseName,
				lap_index: waypoint.lapIndex,
				source_format: 'tcx'
			} as FeatureProp
		}))
	};

	return geojson;
};
