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
						name: track.name
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
						name: waypoint.name
						// 必要に応じてウェイポイントのプロパティを追加
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
						name: route.name
						// 必要に応じてルートのプロパティを追加
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
