import type {
	SymbolLayerSpecification,
	LineLayerSpecification,
	VectorSourceSpecification,
	ExpressionSpecification
} from 'maplibre-gl';

import { DEFAULT_SYMBOL_TEXT_FONT } from '$routes/constants';

/** 道路中心線 vt_rdctg に基づく line-color の共通式（半透明版） */
const rdctgColorHalf: ExpressionSpecification = [
	'match',
	['get', 'vt_rdctg'],
	['国道', '主要道路'],
	'rgba(210,190,139,0.5)',
	'都道府県道',
	'rgba(210,190,139,0.5)',
	'高速自動車国道等',
	'rgba(210,190,139,0.5)',
	'rgba(100,100,100,0.5)'
];

/** 道路中心線 line-color: vt_code 2704/2714 の場合（透明系） */
const codeTransparentColor: ExpressionSpecification = [
	'case',
	['==', ['get', 'vt_motorway'], 1],
	'rgba(210,190,139,0.5)',
	rdctgColorHalf
];

/** 道路中心線 line-color: 通常色（zoom < 14） */
const roadColorBelow14: ExpressionSpecification = [
	'case',
	['in', ['get', 'vt_code'], ['literal', [2704, 2714]]],
	codeTransparentColor,
	[
		'case',
		['==', ['get', 'vt_motorway'], 1],
		'rgba(210,190,139,1)',
		[
			'match',
			['get', 'vt_rdctg'],
			'国道',
			'rgba(210,190,139,1)',
			'都道府県道',
			'rgba(210,190,139,1)',
			'高速自動車国道等',
			'rgba(210,190,139,1)',
			[
				'case',
				['==', ['get', 'vt_rnkwidth'], '3m-5.5m未満'],
				'rgba(173,173,173,1)',
				[
					'match',
					['get', 'vt_code'],
					[2721, 2722, 2723],
					'rgba(173,173,173,1)',
					[2731, 2732, 2733],
					'rgba(200,200,200,1)',
					'rgba(255,255,255,1)'
				]
			]
		]
	]
];

/** 道路中心線 line-color: 通常色（zoom >= 14） */
const roadColorAbove14: ExpressionSpecification = [
	'case',
	['in', ['get', 'vt_code'], ['literal', [2704, 2714]]],
	codeTransparentColor,
	[
		'case',
		['==', ['get', 'vt_motorway'], 1],
		'rgba(210,190,139,1)',
		[
			'match',
			['get', 'vt_rdctg'],
			'国道',
			'rgba(210,190,139,1)',
			'都道府県道',
			'rgba(210,190,139,1)',
			'高速自動車国道等',
			'rgba(210,190,139,1)',
			[
				'match',
				['get', 'vt_code'],
				[2721, 2722, 2723],
				'rgba(173,173,173,1)',
				[2731, 2732, 2733],
				'rgba(200,200,200,1)',
				'rgba(255,255,255,1)'
			]
		]
	]
];

/** 道路中心線 line-color（step by zoom） */
const roadLineColor: ExpressionSpecification = [
	'step',
	['zoom'],
	roadColorBelow14,
	14,
	roadColorAbove14
];

/** 道路中心線 line-opacity */
const roadLineOpacity: ExpressionSpecification = [
	'interpolate',
	['linear'],
	['zoom'],
	12,
	[
		'case',
		[
			'all',
			['!', ['in', ['get', 'vt_rdctg'], ['literal', ['国道', '都道府県道', '高速自動車国道等']]]],
			['==', ['get', 'vt_rnkwidth'], '3m-5.5m未満']
		],
		0,
		1
	],
	13,
	1,
	18,
	0.1
];

/** 道路中心線 line-width（vt_width / vt_rnkwidth ベース） */
const roadLineWidth: ExpressionSpecification = [
	'let',
	'width',
	[
		'case',
		['has', 'vt_width'],
		['get', 'vt_width'],
		[
			'case',
			['has', 'vt_rnkwidth'],
			[
				'match',
				['get', 'vt_rnkwidth'],
				'3m未満',
				300,
				'3m-5.5m未満',
				450,
				'5.5m-13m未満',
				900,
				'13m-19.5m未満',
				1800,
				'19.5m以上',
				2700,
				0
			],
			3000
		]
	],
	'width2',
	[
		'case',
		['has', 'vt_rnkwidth'],
		[
			'match',
			['get', 'vt_rnkwidth'],
			'3m未満',
			700,
			'3m-5.5m未満',
			1200,
			'5.5m-13m未満',
			1700,
			'13m-19.5m未満',
			2200,
			'19.5m以上',
			2700,
			0
		],
		3000
	],
	[
		'interpolate',
		['exponential', 2],
		['zoom'],
		11,
		['match', ['get', 'vt_rdctg'], '国道', 2, '都道府県道', 1.5, '高速自動車国道等', 4, 1],
		12,
		['*', ['^', 2, -9], ['var', 'width2']],
		14,
		['*', ['^', 2, -9], ['var', 'width2']],
		23,
		['var', 'width']
	]
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
			['==', '$type', 'LineString'],
			['==', 'brunnel', 'tunnel'],
			['==', 'class', 'transit']
		],
		layout: {
			'line-cap': 'butt',
			'line-join': 'miter'
		},
		paint: {
			'line-color': 'hsl(34, 12%, 66%)',
			'line-dasharray': [3, 3],
			'line-opacity': {
				base: 1,
				stops: [
					[11, 0],
					[16, 1]
				]
			}
		}
	},
	{
		id: 'road_pier',
		type: 'line',
		metadata: {},
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: ['all', ['==', '$type', 'LineString'], ['in', 'class', 'pier']],
		layout: {
			'line-cap': 'round',
			'line-join': 'round'
		},
		paint: {
			'line-color': 'hsl(47, 26%, 88%)',
			'line-width': {
				base: 1.2,
				stops: [
					[15, 1],
					[17, 4]
				]
			}
		}
	},
	{
		id: 'road_path',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: ['all', ['==', '$type', 'LineString'], ['in', 'class', 'path', 'track']],
		layout: {
			'line-cap': 'square',
			'line-join': 'bevel'
		},
		paint: {
			'line-color': 'hsl(0, 0%, 97%)',
			'line-dasharray': [1, 1],
			'line-width': {
				base: 1.55,
				stops: [
					[4, 0.25],
					[20, 10]
				]
			}
		}
	},
	{
		id: 'road_minor',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		minzoom: 13,
		filter: ['all', ['==', '$type', 'LineString'], ['in', 'class', 'minor', 'service']],
		layout: {
			'line-cap': 'round',
			'line-join': 'round'
		},
		paint: {
			'line-color': 'hsl(0, 0%, 97%)',
			'line-width': {
				base: 1.55,
				stops: [
					[4, 0.25],
					[20, 30]
				]
			}
		}
	},
	{
		id: 'tunnel_minor',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: [
			'all',
			['==', '$type', 'LineString'],
			['==', 'brunnel', 'tunnel'],
			['==', 'class', 'minor_road']
		],
		layout: {
			'line-cap': 'butt',
			'line-join': 'miter'
		},
		paint: {
			'line-color': '#efefef',
			'line-dasharray': [0.36, 0.18],
			'line-width': {
				base: 1.55,
				stops: [
					[4, 0.25],
					[20, 30]
				]
			}
		}
	},
	{
		id: 'tunnel_major',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: [
			'all',
			['==', '$type', 'LineString'],
			['==', 'brunnel', 'tunnel'],
			['in', 'class', 'primary', 'secondary', 'tertiary', 'trunk']
		],
		layout: {
			'line-cap': 'butt',
			'line-join': 'miter'
		},
		paint: {
			'line-color': '#fff',
			'line-dasharray': [0.28, 0.14],
			'line-width': {
				base: 1.4,
				stops: [
					[6, 0.5],
					[20, 30]
				]
			}
		}
	},
	{
		id: 'road_trunk_primary',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: ['all', ['==', '$type', 'LineString'], ['in', 'class', 'trunk', 'primary']],
		layout: {
			'line-cap': 'round',
			'line-join': 'round'
		},
		paint: {
			'line-color': '#fff',
			'line-width': {
				base: 1.4,
				stops: [
					[6, 0.5],
					[20, 30]
				]
			}
		}
	},
	{
		id: 'road_secondary_tertiary',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: ['all', ['==', '$type', 'LineString'], ['in', 'class', 'secondary', 'tertiary']],
		layout: {
			'line-cap': 'round',
			'line-join': 'round'
		},
		paint: {
			'line-color': '#fff',
			'line-width': {
				base: 1.4,
				stops: [
					[6, 0.5],
					[20, 20]
				]
			}
		}
	},
	{
		id: 'road_major_motorway',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: ['all', ['==', '$type', 'LineString'], ['==', 'class', 'motorway']],
		layout: {
			'line-cap': 'round',
			'line-join': 'round'
		},
		paint: {
			'line-color': 'hsl(0, 0%, 100%)',
			'line-offset': 0,
			'line-width': {
				base: 1.4,
				stops: [
					[8, 1],
					[16, 10]
				]
			}
		}
	},
	{
		id: 'railway-transit',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: ['all', ['==', 'class', 'transit'], ['!=', 'brunnel', 'tunnel']],
		layout: {
			visibility: 'visible'
		},
		paint: {
			'line-color': 'hsl(34, 12%, 66%)',
			'line-opacity': {
				base: 1,
				stops: [
					[11, 0],
					[16, 1]
				]
			}
		}
	},
	{
		id: 'railway',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: ['==', 'class', 'rail'],
		layout: {
			visibility: 'visible'
		},
		paint: {
			'line-color': 'hsl(34, 12%, 66%)',
			'line-opacity': {
				base: 1,
				stops: [
					[11, 0],
					[16, 1]
				]
			}
		}
	},
	{
		id: 'bridge_minor case',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: [
			'all',
			['==', '$type', 'LineString'],
			['==', 'brunnel', 'bridge'],
			['==', 'class', 'minor_road']
		],
		layout: {
			'line-cap': 'butt',
			'line-join': 'miter'
		},
		paint: {
			'line-color': '#dedede',
			'line-gap-width': {
				base: 1.55,
				stops: [
					[4, 0.25],
					[20, 30]
				]
			},
			'line-width': {
				base: 1.6,
				stops: [
					[12, 0.5],
					[20, 10]
				]
			}
		}
	},
	{
		id: 'bridge_major case',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: [
			'all',
			['==', '$type', 'LineString'],
			['==', 'brunnel', 'bridge'],
			['in', 'class', 'primary', 'secondary', 'tertiary', 'trunk']
		],
		layout: {
			'line-cap': 'butt',
			'line-join': 'miter'
		},
		paint: {
			'line-color': '#dedede',
			'line-gap-width': {
				base: 1.55,
				stops: [
					[4, 0.25],
					[20, 30]
				]
			},
			'line-width': {
				base: 1.6,
				stops: [
					[12, 0.5],
					[20, 10]
				]
			}
		}
	},
	{
		id: 'bridge_minor',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: [
			'all',
			['==', '$type', 'LineString'],
			['==', 'brunnel', 'bridge'],
			['==', 'class', 'minor_road']
		],
		layout: {
			'line-cap': 'round',
			'line-join': 'round'
		},
		paint: {
			'line-color': '#efefef',
			'line-width': {
				base: 1.55,
				stops: [
					[4, 0.25],
					[20, 30]
				]
			}
		}
	},
	{
		id: 'bridge_major',
		type: 'line',
		source: 'openmaptiles',
		'source-layer': 'transportation',
		filter: [
			'all',
			['==', '$type', 'LineString'],
			['==', 'brunnel', 'bridge'],
			['in', 'class', 'primary', 'secondary', 'tertiary', 'trunk']
		],
		layout: {
			'line-cap': 'round',
			'line-join': 'round'
		},
		paint: {
			'line-color': '#fff',
			'line-width': {
				base: 1.4,
				stops: [
					[6, 0.5],
					[20, 30]
				]
			}
		}
	}
];
