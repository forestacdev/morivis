import type { LineLayerSpecification, CircleLayerSpecification } from 'maplibre-gl';

export const streetViewLineLayer: LineLayerSpecification = {
	// ストリートビューのライン
	id: '@street_view_line_layer',
	type: 'line',
	source: 'street_view_sources',
	'source-layer': 'THETA360_line',
	paint: {
		'line-color': '#08fa00',
		'line-width': 10,
		'line-opacity': 0.5,
		'line-blur': 0.5
	},
	layout: {
		visibility: 'none',
		'line-cap': 'round',
		'line-join': 'round'
	}
};

export const streetViewCircleLayer: CircleLayerSpecification = {
	// ストリートビューのポイント
	id: '@street_view_circle_layer',
	type: 'circle',
	source: 'street_view_sources',
	'source-layer': 'THETA360',
	minzoom: 15,
	layout: {
		visibility: 'none'
	},
	paint: {
		'circle-color': [
			'case',
			['boolean', ['feature-state', 'hover'], false],
			'#00fad0', // ホバー中
			'#08fa00' // 通常時
		],
		'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 20, 12],
		'circle-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.8, 0.6],
		'circle-stroke-width': 2,
		'circle-stroke-color': '#ffffff',
		'circle-stroke-opacity': 0.5,
		'circle-blur': 0.3
	}
};
