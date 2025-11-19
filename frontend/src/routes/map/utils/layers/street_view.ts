import type { LineLayerSpecification, CircleLayerSpecification } from 'maplibre-gl';

export const streetViewLineLayer: LineLayerSpecification = {
	// ストリートビューのライン
	id: '@street_view_line_layer',
	type: 'line',
	source: 'street_view_link_sources',
	paint: {
		'line-color': '#08fa00',
		'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 15, 12, 18, 20, 22, 40],

		'line-opacity': 0.6,
		'line-blur': 0.5
	},
	layout: {
		'line-cap': 'round',
		'line-join': 'round'
	}
};

export const streetViewCircleLayer: CircleLayerSpecification = {
	// ストリートビューのポイント
	id: '@street_view_circle_layer',
	type: 'circle',
	source: 'street_view_node_sources',
	filter: ['==', ['get', 'has_link'], false],
	minzoom: 10,
	paint: {
		'circle-color': '#08fa00',
		'circle-radius': [
			'interpolate',
			['linear'],
			['zoom'],
			10,
			1, // At zoom level 5, radius is 6
			15,
			12 // At zoom level 15, radius is 12
		],
		'circle-opacity': 0.6,
		'circle-stroke-width': 2,
		'circle-stroke-color': '#ffffff',
		'circle-stroke-opacity': 0.6,
		'circle-blur': 0.3
	}
};
