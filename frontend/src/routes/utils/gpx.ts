import GPXParser from 'gpxparser';
import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';

export const gpxFileToGeojson = async (
	file: File
): Promise<FeatureCollection<Geometry, GeoJsonProperties>> => {
	try {
		const gpxData = await file.text();
		const parser = new GPXParser();
		parser.parse(gpxData);

		const geojson: GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.Point> = {
			type: 'FeatureCollection',
			features: []
		};

		// トラック (経路) を GeoJSON の LineString として追加
		parser.tracks.forEach((track) => {
			if (track.points.length > 0) {
				const coordinates = track.points.map((p) => [p.lon, p.lat]);
				geojson.features.push({
					type: 'Feature',
					geometry: {
						type: 'LineString',
						coordinates: coordinates
					},
					properties: {
						// 必要に応じてトラックのプロパティを追加
					}
				});
			}
		});

		// ウェイポイント (地点) を GeoJSON の Point として追加
		parser.waypoints.forEach((waypoint) => {
			geojson.features.push({
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: [waypoint.lon, waypoint.lat]
				},
				properties: {
					name: waypoint.name
					// 必要に応じてウェイポイントのプロパティを追加
				}
			});
		});

		// ルート (特定の順序で巡る地点) も同様に追加できます
		parser.routes.forEach((route) => {
			if (route.points.length > 0) {
				const coordinates = route.points.map((p) => [p.lon, p.lat]);
				geojson.features.push({
					type: 'Feature',
					geometry: {
						type: 'LineString',
						coordinates: coordinates
					},
					properties: {
						name: route.name
						// 必要に応じてルートのプロパティを追加
					}
				});
			}
		});

		return geojson;
	} catch (error) {
		console.error('GeoJSON parsing error:', error);
		throw new Error('Failed to parse GeoJSON file');
	}
};
