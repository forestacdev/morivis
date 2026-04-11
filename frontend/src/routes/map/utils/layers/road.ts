import type {
	SymbolLayerSpecification,
	LineLayerSpecification,
	VectorSourceSpecification,
	ExpressionSpecification
} from 'maplibre-gl';

import { DEFAULT_SYMBOL_TEXT_FONT } from '$routes/constants';

const createZoomInterpolation = (
	base: number,
	stops: Array<[number, number]>
): ExpressionSpecification => [
	'interpolate',
	['exponential', base],
	['zoom'],
	...stops.flatMap(([zoom, value]) => [zoom, value])
];

/** OpenMapTiles の道路系レイヤー line-opacity */
const roadLineOpacity: ExpressionSpecification = [
	'interpolate',
	['linear'],
	['zoom'],
	13,
	1,
	14,
	1,
	18,
	0.3
];

export const roadSources: Record<string, VectorSourceSpecification> = {
	v: {
		type: 'vector',
		minzoom: 4,
		maxzoom: 16,
		url: 'pmtiles://https://cyberjapandata.gsi.go.jp/xyz/optimal_bvmap-v1/optimal_bvmap-v1.pmtiles',
		// tiles: ['https://cyberjapandata.gsi.go.jp/xyz/optimal_bvmap-v1/{z}/{x}/{y}.pbf'],
		attribution: '国土地理院最適化ベクトルタイル'
	},
	openmaptiles: {
		type: 'vector',
		url: 'pmtiles://https://tile.openstreetmap.jp/static/planet.pmtiles'
	}
};

export const roadLabelLayers: SymbolLayerSpecification[] = [
	{
		id: '注記道路番号',
		type: 'symbol',
		source: 'v',
		'source-layer': 'Anno',
		filter: [
			'step',
			['zoom'],
			[
				'all',
				['==', ['geometry-type'], 'Point'],
				['in', ['get', 'vt_code'], ['literal', [2901, 2903, 2904, 7701]]]
			],
			16,
			[
				'all',
				['==', ['geometry-type'], 'Point'],
				['in', ['get', 'vt_flag17'], ['literal', [0, 1]]],
				['in', ['get', 'vt_code'], ['literal', [2901, 2903, 2904, 7701]]]
			],
			17,
			[
				'all',
				['==', ['geometry-type'], 'Point'],
				['in', ['get', 'vt_flag17'], ['literal', [1, 2]]],
				['in', ['get', 'vt_code'], ['literal', [2901, 2903, 2904, 7701]]]
			]
		],
		layout: {
			'icon-allow-overlap': true,
			'icon-image': [
				'match',
				['get', 'vt_code'],
				2901,
				'国道番号-20',
				2903,
				'都市高速道路番号-20',
				2904,
				'高速道路番号-20',
				''
			],
			'icon-size': [
				'let',
				'size',
				['match', ['get', 'vt_code'], 7701, 1.4, 1.0],
				['interpolate', ['linear'], ['zoom'], 15, ['var', 'size'], 17, ['*', 2, ['var', 'size']]]
			],
			'symbol-sort-key': ['match', ['get', 'vt_code'], 2901, 88, 2903, 50, 2904, 49, 7701, 111, 0],
			'text-allow-overlap': false,
			'text-font': DEFAULT_SYMBOL_TEXT_FONT,
			'text-justify': 'auto',
			'text-size': [
				'let',
				'size',
				['match', ['get', 'vt_code'], 2901, 10, 7701, 12, 8],
				['interpolate', ['linear'], ['zoom'], 15, ['var', 'size'], 17, ['*', 2, ['var', 'size']]]
			],
			'text-field': ['get', 'vt_text'],
			'text-max-width': 100
		},
		paint: {
			'text-color': ['match', ['get', 'vt_code'], 7701, 'rgba(0,0,0,1)', 'rgba(255,255,255,1)']
		}
	}
];

export const roadLineLayers: LineLayerSpecification[] = [
	{
		id: 'tunnel_railway_transit',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		minzoom: 0,
		filter: [
			'all',
			['==', ['geometry-type'], 'LineString'],
			['==', ['get', 'brunnel'], 'tunnel'],
			['==', ['get', 'class'], 'transit']
		],
		layout: {
			'line-cap': 'butt',
			'line-join': 'miter'
		},
		paint: {
			'line-color': 'rgba(200,200,200,1)',
			'line-dasharray': [3, 3],
			'line-opacity': createZoomInterpolation(1, [
				[11, 0],
				[16, 1]
			])
		}
	},
	{
		id: 'road_pier',
		type: 'line',
		metadata: {},
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: [
			'all',
			['==', ['geometry-type'], 'LineString'],
			['in', ['get', 'class'], ['literal', ['pier']]]
		],
		layout: {
			'line-cap': 'round',
			'line-join': 'round'
		},
		paint: {
			'line-color': 'rgba(200,200,200,1)',
			'line-width': createZoomInterpolation(1.2, [
				[15, 1],
				[17, 4]
			])
		}
	},
	{
		id: 'road_path',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: [
			'all',
			['==', ['geometry-type'], 'LineString'],
			['in', ['get', 'class'], ['literal', ['path', 'track']]]
		],
		layout: {
			'line-join': 'round',
			'line-cap': 'round'
		},
		paint: {
			'line-color': 'rgba(200,200,200,1)',
			'line-opacity': roadLineOpacity,
			'line-width': createZoomInterpolation(1.55, [
				[4, 0.25],
				[20, 15]
			])
		}
	},
	{
		id: 'road_minor',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		minzoom: 13,
		filter: [
			'all',
			['==', ['geometry-type'], 'LineString'],
			['in', ['get', 'class'], ['literal', ['minor', 'service']]]
		],
		layout: {
			'line-cap': 'round',
			'line-join': 'round'
		},
		paint: {
			'line-color': 'rgba(200,200,200,1)',
			'line-opacity': roadLineOpacity,
			'line-width': createZoomInterpolation(1.55, [
				[4, 0.25],
				[20, 30]
			])
		}
	},
	{
		id: 'tunnel_minor',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: [
			'all',
			['==', ['geometry-type'], 'LineString'],
			['==', ['get', 'brunnel'], 'tunnel'],
			['==', ['get', 'class'], 'minor_road']
		],
		layout: {
			'line-cap': 'butt',
			'line-join': 'miter'
		},
		paint: {
			'line-color': 'rgba(200,200,200,1)',
			'line-opacity': roadLineOpacity,
			'line-dasharray': [0.36, 0.18],
			'line-width': createZoomInterpolation(1.55, [
				[4, 0.25],
				[20, 30]
			])
		}
	},
	{
		id: 'tunnel_major',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: [
			'all',
			['==', ['geometry-type'], 'LineString'],
			['==', ['get', 'brunnel'], 'tunnel'],
			['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'tertiary', 'trunk']]]
		],
		layout: {
			'line-cap': 'butt',
			'line-join': 'miter'
		},
		paint: {
			'line-color': 'rgba(200,200,200,1)',
			'line-opacity': roadLineOpacity,
			'line-dasharray': [0.28, 0.14],
			'line-width': createZoomInterpolation(1.4, [
				[6, 0.5],
				[20, 30]
			])
		}
	},
	{
		id: 'road_trunk_primary',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: [
			'all',
			['==', ['geometry-type'], 'LineString'],
			['in', ['get', 'class'], ['literal', ['trunk', 'primary']]]
		],
		layout: {
			'line-cap': 'round',
			'line-join': 'round'
		},
		paint: {
			'line-color': 'rgba(200,200,200,1)',
			'line-opacity': roadLineOpacity,
			'line-width': createZoomInterpolation(1.4, [
				[6, 0.5],
				[20, 30]
			])
		}
	},
	{
		id: 'road_secondary_tertiary',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: [
			'all',
			['==', ['geometry-type'], 'LineString'],
			['in', ['get', 'class'], ['literal', ['secondary', 'tertiary']]]
		],
		layout: {
			'line-cap': 'round',
			'line-join': 'round'
		},
		paint: {
			'line-color': 'rgba(200,200,200,1)',
			'line-opacity': roadLineOpacity,
			'line-width': createZoomInterpolation(1.4, [
				[6, 0.5],
				[20, 20]
			])
		}
	},
	{
		id: 'road_major_motorway',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'class'], 'motorway']],
		layout: {
			'line-cap': 'round',
			'line-join': 'round'
		},
		paint: {
			'line-color': 'rgba(210,190,139,1)',
			'line-opacity': roadLineOpacity,
			'line-offset': 0,
			'line-width': createZoomInterpolation(1.4, [
				[8, 1],
				[16, 10]
			])
		}
	},
	{
		id: 'railway-transit',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: ['all', ['==', ['get', 'class'], 'transit'], ['!=', ['get', 'brunnel'], 'tunnel']],
		layout: {
			visibility: 'visible'
		},
		paint: {
			'line-color': 'hsl(34, 12%, 66%)',
			'line-opacity': createZoomInterpolation(1, [
				[11, 0],
				[16, 1]
			])
		}
	},
	{
		id: 'railway',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: ['==', ['get', 'class'], 'rail'],
		layout: {
			visibility: 'visible'
		},
		paint: {
			'line-color': 'hsl(34, 12%, 66%)',
			'line-opacity': createZoomInterpolation(1, [
				[11, 0],
				[16, 1]
			])
		}
	},
	{
		id: 'bridge_minor case',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: [
			'all',
			['==', ['geometry-type'], 'LineString'],
			['==', ['get', 'brunnel'], 'bridge'],
			['==', ['get', 'class'], 'minor_road']
		],
		layout: {
			'line-cap': 'butt',
			'line-join': 'miter'
		},
		paint: {
			'line-color': 'rgba(200,200,200,1)',
			'line-opacity': roadLineOpacity,
			'line-gap-width': createZoomInterpolation(1.55, [
				[4, 0.25],
				[20, 30]
			]),
			'line-width': createZoomInterpolation(1.6, [
				[12, 0.5],
				[20, 10]
			])
		}
	},
	{
		id: 'bridge_major case',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: [
			'all',
			['==', ['geometry-type'], 'LineString'],
			['==', ['get', 'brunnel'], 'bridge'],
			['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'tertiary', 'trunk']]]
		],
		layout: {
			'line-cap': 'butt',
			'line-join': 'miter'
		},
		paint: {
			'line-color': 'rgba(200,200,200,1)',
			'line-opacity': roadLineOpacity,
			'line-gap-width': createZoomInterpolation(1.55, [
				[4, 0.25],
				[20, 30]
			]),
			'line-width': createZoomInterpolation(1.6, [
				[12, 0.5],
				[20, 10]
			])
		}
	},
	{
		id: 'bridge_minor',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: [
			'all',
			['==', ['geometry-type'], 'LineString'],
			['==', ['get', 'brunnel'], 'bridge'],
			['==', ['get', 'class'], 'minor_road']
		],
		layout: {
			'line-cap': 'round',
			'line-join': 'round'
		},
		paint: {
			'line-color': 'rgba(200,200,200,1)',
			'line-opacity': roadLineOpacity,
			'line-width': createZoomInterpolation(1.55, [
				[4, 0.25],
				[20, 30]
			])
		}
	},
	{
		id: 'bridge_major',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: [
			'all',
			['==', ['geometry-type'], 'LineString'],
			['==', ['get', 'brunnel'], 'bridge'],
			['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'tertiary', 'trunk']]]
		],
		layout: {
			'line-cap': 'round',
			'line-join': 'round'
		},
		paint: {
			'line-color': 'rgba(200,200,200,1)',
			'line-opacity': roadLineOpacity,
			'line-width': createZoomInterpolation(1.4, [
				[6, 0.5],
				[20, 30]
			])
		}
	}
];
