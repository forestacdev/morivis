import type { StyleSpecification } from '$routes/map/utils/maplibre';

export const thumbnailStyle: StyleSpecification = {
	version: 8,
	sources: {
		'test-vector': {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: [{
					type: 'Feature',
					properties: {},
					geometry: { type: 'Point', coordinates: [0, 0] }
				}, {
					type: 'Feature',
					properties: {},
					geometry: { type: 'LineString', coordinates: [[-2, -2], [2, -2]] }
				}, {
					type: 'Feature',
					properties: { color: '#0000ff' },
					geometry: {
						type: 'Polygon',
						coordinates: [[[-2, 1], [2, 1], [2, 2], [-2, 2], [-2, 1]]]
					}
				}]
			}
		}
	},
	layers: [{
		id: 'test-point',
		type: 'circle',
		source: 'test-vector',
		filter: ['==', '$type', 'Point'],
		paint: { 'circle-color': '#ff0000', 'circle-radius': 8 }
	}, {
		id: 'test-line',
		type: 'line',
		source: 'test-vector',
		filter: ['==', '$type', 'LineString'],
		paint: { 'line-color': '#00ff00', 'line-width': 4 }
	}, {
		id: 'test-polygon',
		type: 'fill-extrusion',
		source: 'test-vector',
		filter: ['==', '$type', 'Polygon'],
		paint: { 'fill-extrusion-color': ['get', 'color'], 'fill-extrusion-height': 100 }
	}]
};
