import GPXParser from 'gpxparser';
import type { Route, Track, Waypoint } from 'gpxparser';

import type { FeatureCollection } from '$routes/map/types/geojson';
import type { LineStringGeometry, PointGeometry } from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';

const formatGpxTime = (value: unknown): string | undefined => {
	const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null;

	if (!date || Number.isNaN(date.getTime())) {
		return typeof value === 'string' ? value : undefined;
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

const getTrackTime = (track: Track): string | undefined => {
	return formatGpxTime(track.points[0]?.time);
};

const getBearing = (
	from: { lat: number; lon: number; },
	to: { lat: number; lon: number; }
): number => {
	const toRadians = (value: number) => (value * Math.PI) / 180;
	const toDegrees = (value: number) => (value * 180) / Math.PI;

	const fromLat = toRadians(from.lat);
	const toLat = toRadians(to.lat);
	const deltaLon = toRadians(to.lon - from.lon);

	const y = Math.sin(deltaLon) * Math.cos(toLat);
	const x = Math.cos(fromLat) * Math.sin(toLat)
		- Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon);
	const bearing = toDegrees(Math.atan2(y, x));

	return (bearing + 360) % 360;
};

const getTrackPointAngle = (
	points: Array<{ lat: number; lon: number; }>,
	pointIndex: number
): number | undefined => {
	const currentPoint = points[pointIndex];
	const nextPoint = points[pointIndex + 1];
	const previousPoint = points[pointIndex - 1];

	if (currentPoint && nextPoint) {
		return getBearing(currentPoint, nextPoint);
	}

	if (previousPoint && currentPoint) {
		return getBearing(previousPoint, currentPoint);
	}

	return undefined;
};

export type DataType = 'tracks' | 'track_points' | 'routes' | 'waypoints';
export const checkGpxFile = async (
	file: File
): Promise<{ tracks: boolean; track_points: boolean; routes: boolean; waypoints: boolean; }> => {
	try {
		const gpxData = await file.text();
		const parser = new GPXParser();
		parser.parse(gpxData);

		return {
			tracks: parser.tracks.length > 0,
			track_points: parser.tracks.some((track) => track.points.length > 0),
			routes: parser.routes.length > 0,
			waypoints: parser.waypoints.length > 0
		};
	} catch (error) {
		console.error('GPX ファイルの処理中にエラーが発生しました:', error);

		throw error;
	}
};

export const gpxFileToGeojson = async (file: File, type: DataType): Promise<FeatureCollection> => {
	try {
		const gpxData = await file.text();
		const parser = new GPXParser();
		parser.parse(gpxData);

		let geojson: FeatureCollection;

		if (type === 'tracks') {
			const trackGeojson: FeatureCollection<LineStringGeometry> = {
				type: 'FeatureCollection',
				features: parser.tracks.map((track: Track) => ({
					type: 'Feature',
					geometry: {
						type: 'LineString',
						coordinates: track.points.map((p) => [p.lon, p.lat] as [number, number])
					},
					properties: {
						name: track.name,
						desc: track.cmt, // 説明
						time: getTrackTime(track), // 時間
						src: track.src, // ソース
						number: track.number, // 番号
						link: track.link, // リンク
						type: track.type, // タイプ
						distance: track.distance.total, // 距離
						elevation_max: track.elevation.max, // 最大標高
						elevation_min: track.elevation.min, // 最小標高
						elevation_pos: track.elevation.pos, // 上昇量
						elevation_neg: track.elevation.neg, // 下降量
						elevation_avg: track.elevation.avg, // 平均標高
						slopes: track.slopes // スロープ
						// 必要に応じてトラックのプロパティを追加
					} as unknown as FeatureProp
				}))
			};
			geojson = trackGeojson;
		}

		if (type === 'track_points') {
			const trackPointsGeojson: FeatureCollection<PointGeometry> = {
				type: 'FeatureCollection',
				features: parser.tracks.flatMap((track: Track, trackIndex: number) =>
					track.points.map((point, pointIndex) => ({
						type: 'Feature' as const,
						geometry: {
							type: 'Point' as const,
							coordinates: [point.lon, point.lat] as [number, number]
						},
						properties: {
							track_name: track.name,
							track_index: trackIndex,
							point_index: pointIndex,
							lat: point.lat,
							lon: point.lon,
							ele: point.ele,
							time: formatGpxTime(point.time),
							angle: getTrackPointAngle(track.points, pointIndex)
						} as unknown as FeatureProp
					}))
				)
			};
			geojson = trackPointsGeojson;
		}

		if (type === 'waypoints') {
			// ウェイポイント (地点) を GeoJSON の FeatureCollection として追加
			const waypointsGeojson: FeatureCollection<PointGeometry> = {
				type: 'FeatureCollection',
				features: parser.waypoints.map((waypoint: Waypoint) => ({
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [waypoint.lon, waypoint.lat] as [number, number]
					},
					properties: {
						name: waypoint.name,
						cmt: waypoint.cmt,
						desc: waypoint.desc,
						lat: waypoint.lat,
						lon: waypoint.lon,
						ele: waypoint.ele,
						time: formatGpxTime(waypoint.time)
					} as unknown as FeatureProp
				}))
			};

			geojson = waypointsGeojson;
		}

		if (type === 'routes') {
			const routeGeojson: FeatureCollection<LineStringGeometry> = {
				type: 'FeatureCollection',
				features: parser.routes.map((route: Route) => ({
					type: 'Feature',
					geometry: {
						type: 'LineString',
						coordinates: route.points.map((p) => [p.lon, p.lat] as [number, number])
					},
					properties: {
						name: route.name,
						cmt: route.cmt,
						desc: route.desc,
						src: route.src,
						number: route.number,
						link: route.link,
						type: route.type,
						distance: route.distance.total,
						elevation_max: route.elevation.max,
						elevation_min: route.elevation.min,
						elevation_pos: route.elevation.pos,
						elevation_neg: route.elevation.neg,
						elevation_avg: route.elevation.avg,
						distance_cumul: route.distance.cumul,
						slopes: route.slopes
					} as unknown as FeatureProp
				}))
			};
			geojson = routeGeojson;
		}

		return geojson!;
	} catch (error) {
		console.error('GeoJSON parsing error:', error);
		throw new Error('Failed to parse GeoJSON file');
	}
};
