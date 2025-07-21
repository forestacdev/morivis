import GPXParser from 'gpxparser';
import type { FeatureCollection, GeoJsonProperties, Geometry, LineString, Point } from 'geojson';
export type DataType = 'tracks' | 'routes' | 'waypoints';
export const checkGpxFile = async (
	file: File
): Promise<{ tracks: boolean; routes: boolean; waypoints: boolean }> => {
	try {
		const gpxData = await file.text();
		const parser = new GPXParser();
		parser.parse(gpxData);

		return {
			tracks: parser.tracks.length > 0,
			routes: parser.routes.length > 0,
			waypoints: parser.waypoints.length > 0
		};
	} catch (error) {
		console.error('GPX ファイルの処理中にエラーが発生しました:', error);

		throw error;
	}
};

export const gpxFileToGeojson = async (
	file: File,
	type: DataType
): Promise<FeatureCollection<Geometry, GeoJsonProperties>> => {
	try {
		const gpxData = await file.text();
		const parser = new GPXParser();
		parser.parse(gpxData);

		let geojson: FeatureCollection<Geometry, GeoJsonProperties>;

		if (type === 'tracks') {
			const trackGeojson: FeatureCollection<LineString> = {
				type: 'FeatureCollection',
				features: parser.tracks.map((track) => ({
					type: 'Feature',
					geometry: {
						type: 'LineString',
						coordinates: track.points.map((p) => [p.lon, p.lat])
					},
					properties: {
						name: track.name,
						desc: track.cmt, // 説明
						time: track.desc, // 時間
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
						distance_cumul: track.distance.cumul, // 累積距離
						slopes: track.slopes // スロープ
						// 必要に応じてトラックのプロパティを追加
					}
				}))
			};
			geojson = trackGeojson;
		}

		if (type === 'waypoints') {
			// ウェイポイント (地点) を GeoJSON の FeatureCollection として追加
			const waypointsGeojson: FeatureCollection<Point> = {
				type: 'FeatureCollection',
				features: parser.waypoints.map((waypoint) => ({
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [waypoint.lon, waypoint.lat]
					},
					properties: {
						name: waypoint.name,
						cmt: waypoint.cmt,
						desc: waypoint.desc,
						lat: waypoint.lat,
						lon: waypoint.lon,
						ele: waypoint.ele,
						time: waypoint.time
					}
				}))
			};

			geojson = waypointsGeojson;
		}

		if (type === 'routes') {
			const routeGeojson: FeatureCollection<LineString> = {
				type: 'FeatureCollection',
				features: parser.routes.map((route) => ({
					type: 'Feature',
					geometry: {
						type: 'LineString',
						coordinates: route.points.map((p) => [p.lon, p.lat])
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
					}
				}))
			};
			geojson = routeGeojson;
		}

		return geojson;
	} catch (error) {
		console.error('GeoJSON parsing error:', error);
		throw new Error('Failed to parse GeoJSON file');
	}
};
