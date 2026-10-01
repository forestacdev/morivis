import FitParser, { type ParsedFit } from 'fit-file-parser';
import { formatFit } from './definition';

import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { PointGeometry } from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';

export const MAX_FIT_BYTES = formatFit.limits.maxFileBytes;
export type FitDataType = 'tracks' | 'track_points' | 'waypoints';
export type FitParseResult = Record<FitDataType, FeatureCollection> & { skippedRecords: number; };
type Point = Feature<PointGeometry>;
type FitRecord = NonNullable<ParsedFit['records']>[number];

const finite = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value);

const timestamp = (value: unknown): number | undefined =>
	value instanceof Date && Number.isFinite(value.getTime()) ? value.getTime() : undefined;

const position = (lat: unknown, lon: unknown): [number, number] | null =>
	finite(lat) && finite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
		? [lon, lat]
		: null;

const propertiesFromRecord = (record: FitRecord): FeatureProp => {
	const properties: FeatureProp = { source_format: 'fit' };
	const fields = {
		ele: record.enhanced_altitude ?? record.altitude,
		distance_meters: record.distance,
		heart_rate_bpm: record.heart_rate,
		cadence: record.cadence,
		watts: record.power,
		speed: record.enhanced_speed ?? record.speed,
		temperature: record.temperature,
		gps_accuracy: record.gps_accuracy
	};
	for (const [key, value] of Object.entries(fields)) {
		if (finite(value)) properties[key] = value;
	}
	if (timestamp(record.timestamp) !== undefined) {
		properties.time = record.timestamp!.toISOString().replace('.000Z', 'Z');
	}
	return properties;
};

/** FITの座標はデコーダーでsemicirclesからWGS84の度へ変換済み。 */
export const parseFit = async (buffer: ArrayBuffer): Promise<FitParseResult> => {
	if (buffer.byteLength > MAX_FIT_BYTES) {
		throw new Error('FITは64 MiB以下のファイルを選択してください');
	}
	let data: ParsedFit;
	try {
		data = await new FitParser({
			force: false,
			mode: 'list',
			lengthUnit: 'm',
			speedUnit: 'm/s',
			temperatureUnit: 'celsius'
		}).parseAsync(buffer);
	} catch {
		throw new Error('FITを読み込めませんでした。ファイル形式や破損・欠落を確認してください');
	}

	const result: FitParseResult = {
		tracks: { type: 'FeatureCollection', features: [] },
		track_points: { type: 'FeatureCollection', features: [] },
		waypoints: { type: 'FeatureCollection', features: [] },
		skippedRecords: 0
	};
	// 一時停止やセッションの境界を越えて線を結ばない。
	const boundaries = [
		...(data.events ?? [])
			.filter(event => event.event === 'timer' && String(event.event_type).startsWith('stop'))
			.map(event => timestamp(event.timestamp)),
		...(data.sessions ?? []).map(session => timestamp(session.timestamp))
	].filter((value): value is number => value !== undefined).sort((a, b) => a - b);
	let boundaryIndex = 0;
	let previousTime: number | undefined;
	let segment: Point[] = [];
	let segmentIndex = 0;
	const flush = () => {
		if (segment.length >= 2) {
			const first = segment[0].properties;
			const last = segment[segment.length - 1].properties;
			result.tracks.features.push({
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: segment.map(point => point.geometry.coordinates)
				},
				properties: {
					source_format: 'fit',
					track_index: segmentIndex,
					point_count: segment.length,
					...(first.time !== undefined && { time: first.time }),
					...(last.time !== undefined && { end_time: last.time })
				}
			});
		}
		if (segment.length) segmentIndex++;
		segment = [];
	};
	for (const record of data.records ?? []) {
		const coordinates = position(record.position_lat, record.position_long);
		if (!coordinates) {
			result.skippedRecords++;
			flush();
			continue;
		}
		const time = timestamp(record.timestamp);
		if (time !== undefined) {
			if (previousTime !== undefined && time < previousTime) flush();
			while (boundaryIndex < boundaries.length && boundaries[boundaryIndex] < time) {
				if (previousTime !== undefined && boundaries[boundaryIndex] >= previousTime) {
					flush();
				}
				boundaryIndex++;
			}
		}
		const point: Point = {
			type: 'Feature',
			geometry: { type: 'Point', coordinates },
			properties: {
				...propertiesFromRecord(record),
				track_index: segmentIndex,
				point_index: result.track_points.features.length,
				lon: coordinates[0],
				lat: coordinates[1]
			}
		};
		segment.push(point);
		result.track_points.features.push(point);
		previousTime = time;
	}
	flush();

	for (const waypoint of data.course_points ?? []) {
		const coordinates = position(waypoint.position_lat, waypoint.position_long);
		if (!coordinates) continue;
		const properties: FeatureProp = {
			source_format: 'fit',
			lon: coordinates[0],
			lat: coordinates[1]
		};
		if (waypoint.name) properties.name = waypoint.name;
		if (waypoint.type !== undefined) properties.point_type = waypoint.type;
		if (finite(waypoint.distance)) properties.distance_meters = waypoint.distance;
		if (timestamp(waypoint.timestamp) !== undefined) {
			properties.time = waypoint.timestamp!.toISOString().replace('.000Z', 'Z');
		}
		result.waypoints.features.push({
			type: 'Feature',
			geometry: { type: 'Point', coordinates },
			properties
		});
	}
	if (!result.track_points.features.length && !result.waypoints.features.length) {
		throw new Error(
			'FITに表示できる位置情報がありません。GPSを記録したアクティビティまたはコースを選択してください'
		);
	}
	return result;
};
