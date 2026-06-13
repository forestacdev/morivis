/**
 * References:
 * - https://support.google.com/maps/answer/6258979
 * - https://locationhistoryformat.com/reference/semantic/
 */
import type { FeatureCollection } from '$routes/map/types/geojson';
import type { LineStringGeometry, PointGeometry } from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';

type JsonObject = Record<string, unknown>;

type LocationHistoryVisitRecord = {
	startTime: string;
	endTime: string;
	visit: {
		hierarchyLevel?: string;
		probability?: string;
		topCandidate?: {
			probability?: string;
			semanticType?: string;
			placeID?: string;
			placeLocation?: string;
		};
	};
};

type LocationHistoryActivityRecord = {
	startTime: string;
	endTime: string;
	activity: {
		probability?: string;
		start?: string;
		end?: string;
		distanceMeters?: string;
		topCandidate?: {
			type?: string;
			probability?: string;
		};
	};
};

type LocationHistoryTimelineRecord = {
	startTime: string;
	endTime: string;
	timelinePath: Array<{
		point?: string;
		durationMinutesOffsetFromStartTime?: string;
	}>;
};

type LocationHistoryRecord =
	| LocationHistoryVisitRecord
	| LocationHistoryActivityRecord
	| LocationHistoryTimelineRecord;

export type LocationHistoryDataType = 'visits' | 'activities' | 'timeline_points';

export interface LocationHistorySummary {
	visitCount: number;
	activityCount: number;
	timelineSegmentCount: number;
	timelinePointCount: number;
}

const asArray = <T>(value: T | T[] | null | undefined): T[] => {
	if (value == null) return [];
	return Array.isArray(value) ? value : [value];
};

const asObject = (value: unknown): JsonObject | null => {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as JsonObject)
		: null;
};

const isFiniteNumber = (value: unknown): value is number => {
	return typeof value === 'number' && Number.isFinite(value);
};

const toFiniteNumber = (value: unknown): number | undefined => {
	if (isFiniteNumber(value)) return value;
	if (typeof value !== 'string') return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
};

const parseGeoPoint = (value: unknown): [number, number] | null => {
	if (typeof value !== 'string') return null;
	const match = value.trim().match(/^geo:([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)$/i);
	if (!match) return null;

	const lat = Number(match[1]);
	const lon = Number(match[2]);
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

	return [lon, lat];
};

const formatJstOffset = (offsetMinutes: number) => {
	const sign = offsetMinutes >= 0 ? '+' : '-';
	const absoluteMinutes = Math.abs(offsetMinutes);
	const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0');
	const minutes = String(absoluteMinutes % 60).padStart(2, '0');
	return `${sign}${hours}:${minutes}`;
};

const normalizeIsoTime = (value: unknown): string | null => {
	if (typeof value !== 'string' || value.trim() === '') return null;

	const timestamp = Date.parse(value);
	if (Number.isNaN(timestamp)) return null;

	const date = new Date(timestamp);
	const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
	const year = jstDate.getUTCFullYear();
	const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
	const day = String(jstDate.getUTCDate()).padStart(2, '0');
	const hours = String(jstDate.getUTCHours()).padStart(2, '0');
	const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
	const seconds = String(jstDate.getUTCSeconds()).padStart(2, '0');

	return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${formatJstOffset(9 * 60)}`;
};

const addMinutes = (value: string, minutesOffset: number): string | null => {
	const timestamp = Date.parse(value);
	if (Number.isNaN(timestamp)) return null;
	return normalizeIsoTime(new Date(timestamp + minutesOffset * 60 * 1000).toISOString());
};

const createDurationMinutes = (startTime: string, endTime: string): number | undefined => {
	const start = Date.parse(startTime);
	const end = Date.parse(endTime);
	if (Number.isNaN(start) || Number.isNaN(end)) return undefined;
	return Math.max((end - start) / (1000 * 60), 0);
};

const parseLocationHistoryText = (text: string): LocationHistoryRecord[] => {
	const parsed = JSON.parse(text) as unknown;
	if (!Array.isArray(parsed)) {
		throw new Error('Location History は配列形式の JSON である必要があります');
	}

	return parsed.filter((item): item is LocationHistoryRecord => {
		const record = asObject(item);
		if (!record) return false;
		if (typeof record.startTime !== 'string' || typeof record.endTime !== 'string') {
			return false;
		}
		return (
			asObject(record.visit) !== null
			|| asObject(record.activity) !== null
			|| Array.isArray(record.timelinePath)
		);
	});
};

const isLocationHistoryRecord = (record: LocationHistoryRecord) => {
	const objectRecord = asObject(record);
	if (!objectRecord) return false;
	return (
		typeof objectRecord.startTime === 'string'
		&& typeof objectRecord.endTime === 'string'
		&& (asObject(objectRecord.visit) !== null
			|| asObject(objectRecord.activity) !== null
			|| Array.isArray(objectRecord.timelinePath))
	);
};

const createVisitFeatures = (
	records: LocationHistoryRecord[]
): FeatureCollection<PointGeometry, FeatureProp> => {
	const features = records.flatMap((record, index) => {
		const rawRecord = asObject(record);
		const visit = asObject(rawRecord?.visit);
		const topCandidate = asObject(visit?.topCandidate);
		if (!rawRecord || !visit || !topCandidate) return [];

		const point = parseGeoPoint(topCandidate.placeLocation);
		const startTime = normalizeIsoTime(rawRecord.startTime);
		const endTime = normalizeIsoTime(rawRecord.endTime);
		if (!point || !startTime || !endTime) return [];

		const durationMinutes = createDurationMinutes(startTime, endTime);
		const properties = {
			record_type: 'visit',
			time: startTime,
			start_time: startTime,
			end_time: endTime,
			duration_minutes: durationMinutes,
			duration_hours: durationMinutes == null
				? undefined
				: Math.round((durationMinutes / 60) * 100) / 100,
			hierarchy_level: visit.hierarchyLevel,
			visit_probability: toFiniteNumber(visit.probability),
			candidate_probability: toFiniteNumber(topCandidate.probability),
			semantic_type: topCandidate.semanticType,
			place_id: topCandidate.placeID,
			source_format: 'location-history'
		} satisfies Record<string, unknown>;

		return [
			{
				type: 'Feature' as const,
				id: `visit-${index}`,
				geometry: {
					type: 'Point' as const,
					coordinates: point
				},
				properties: Object.fromEntries(
					Object.entries(properties).filter(([, value]) => value !== undefined)
				) as FeatureProp
			}
		];
	});

	return {
		type: 'FeatureCollection',
		features
	};
};

const createActivityFeatures = (
	records: LocationHistoryRecord[]
): FeatureCollection<LineStringGeometry, FeatureProp> => {
	const features = records.flatMap((record, index) => {
		const rawRecord = asObject(record);
		const activity = asObject(rawRecord?.activity);
		const topCandidate = asObject(activity?.topCandidate);
		if (!rawRecord || !activity || !topCandidate) return [];

		const startPoint = parseGeoPoint(activity.start);
		const endPoint = parseGeoPoint(activity.end);
		const startTime = normalizeIsoTime(rawRecord.startTime);
		const endTime = normalizeIsoTime(rawRecord.endTime);
		if (!startPoint || !endPoint || !startTime || !endTime) return [];

		const durationMinutes = createDurationMinutes(startTime, endTime);
		const properties = {
			record_type: 'activity',
			time: startTime,
			start_time: startTime,
			end_time: endTime,
			duration_minutes: durationMinutes,
			duration_hours: durationMinutes == null
				? undefined
				: Math.round((durationMinutes / 60) * 100) / 100,
			activity_type: topCandidate.type,
			activity_probability: toFiniteNumber(topCandidate.probability),
			record_probability: toFiniteNumber(activity.probability),
			distance_meters: toFiniteNumber(activity.distanceMeters),
			source_format: 'location-history'
		} satisfies Record<string, unknown>;

		return [
			{
				type: 'Feature' as const,
				id: `activity-${index}`,
				geometry: {
					type: 'LineString' as const,
					coordinates: [startPoint, endPoint]
				},
				properties: Object.fromEntries(
					Object.entries(properties).filter(([, value]) => value !== undefined)
				) as FeatureProp
			}
		];
	});

	return {
		type: 'FeatureCollection',
		features
	};
};

const createTimelinePointFeatures = (
	records: LocationHistoryRecord[]
): FeatureCollection<PointGeometry, FeatureProp> => {
	const features = records.flatMap((record, recordIndex) => {
		const rawRecord = asObject(record);
		if (!rawRecord || !Array.isArray(rawRecord.timelinePath)) return [];

		const segmentStartTime = normalizeIsoTime(rawRecord.startTime);
		const segmentEndTime = normalizeIsoTime(rawRecord.endTime);
		if (!segmentStartTime || !segmentEndTime) return [];

		return asArray(rawRecord.timelinePath).flatMap((item, pointIndex) => {
			const timelinePoint = asObject(item);
			if (!timelinePoint) return [];

			const point = parseGeoPoint(timelinePoint.point);
			const minutesOffset = toFiniteNumber(timelinePoint.durationMinutesOffsetFromStartTime);
			if (!point || minutesOffset == null) return [];

			const time = addMinutes(segmentStartTime, minutesOffset);
			if (!time) return [];

			const properties = {
				record_type: 'timeline_point',
				time,
				segment_start_time: segmentStartTime,
				segment_end_time: segmentEndTime,
				duration_minutes_offset: minutesOffset,
				segment_index: recordIndex,
				point_index: pointIndex,
				source_format: 'location-history'
			} satisfies Record<string, unknown>;

			return [
				{
					type: 'Feature' as const,
					id: `timeline-${recordIndex}-${pointIndex}`,
					geometry: {
						type: 'Point' as const,
						coordinates: point
					},
					properties: properties as FeatureProp
				}
			];
		});
	});

	return {
		type: 'FeatureCollection',
		features
	};
};

const getLocationHistorySummary = (records: LocationHistoryRecord[]): LocationHistorySummary => {
	let visitCount = 0;
	let activityCount = 0;
	let timelineSegmentCount = 0;
	let timelinePointCount = 0;

	for (const record of records) {
		if (!isLocationHistoryRecord(record)) continue;

		const rawRecord = asObject(record);
		if (!rawRecord) continue;

		if (asObject(rawRecord.visit)) {
			visitCount += 1;
		}

		if (asObject(rawRecord.activity)) {
			activityCount += 1;
		}

		if (Array.isArray(rawRecord.timelinePath)) {
			timelineSegmentCount += 1;
			timelinePointCount += rawRecord.timelinePath.filter((item) => {
				const timelinePoint = asObject(item);
				return Boolean(
					timelinePoint
						&& parseGeoPoint(timelinePoint.point)
						&& toFiniteNumber(timelinePoint.durationMinutesOffsetFromStartTime) != null
				);
			}).length;
		}
	}

	return {
		visitCount,
		activityCount,
		timelineSegmentCount,
		timelinePointCount
	};
};

export const isLocationHistoryText = (text: string): boolean => {
	try {
		const records = parseLocationHistoryText(text);
		if (records.length === 0) return false;

		const summary = getLocationHistorySummary(records);
		return summary.visitCount > 0 || summary.activityCount > 0
			|| summary.timelinePointCount > 0;
	} catch {
		return false;
	}
};

export const isLocationHistoryFile = async (file: File): Promise<boolean> => {
	return isLocationHistoryText(await file.text());
};

export const inspectLocationHistoryFile = async (file: File): Promise<LocationHistorySummary> => {
	return getLocationHistorySummary(parseLocationHistoryText(await file.text()));
};

export const locationHistoryFileToGeojson = async (
	file: File,
	dataType: LocationHistoryDataType
): Promise<FeatureCollection> => {
	const records = parseLocationHistoryText(await file.text());

	if (dataType === 'visits') {
		return createVisitFeatures(records) as unknown as FeatureCollection;
	}

	if (dataType === 'activities') {
		return createActivityFeatures(records) as unknown as FeatureCollection;
	}

	return createTimelinePointFeatures(records) as unknown as FeatureCollection;
};
