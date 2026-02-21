import type { ExpressionSpecification } from 'maplibre-gl';

/** vt_rtcode に基づく線幅の共通式 */
const railWidthByRtcode: ExpressionSpecification = [
	'match',
	['get', 'vt_rtcode'],
	'JR',
	600,
	'JR以外',
	600,
	'地下鉄',
	500,
	'路面',
	400,
	'索道',
	400,
	'特殊鉄道',
	300,
	'側線',
	300,
	0
];

/** 複線・駅部分で2倍にする乗数 */
const railDoubleMul: ExpressionSpecification = [
	'case',
	['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]],
	2,
	1
];

/** 中心線・橋の共通 line-width */
const railCenterLineWidth: ExpressionSpecification = [
	'let',
	'width',
	['*', railWidthByRtcode, railDoubleMul],
	[
		'interpolate',
		['exponential', 2],
		['zoom'],
		0,
		[
			'match',
			['get', 'vt_rtcode'],
			'JR',
			['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 5, 3],
			'索道',
			0.5,
			'特殊鉄道',
			0.5,
			['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 3, 2]
		],
		14,
		['*', ['^', 2, -8], ['var', 'width']],
		23,
		['*', ['match', ['get', 'vt_rtcode'], 'JR以外', 0.6, '地下鉄', 0.6, 1], ['var', 'width']]
	]
];

/** 中心線・橋の共通 line-color */
const railCenterLineColor: ExpressionSpecification = [
	'case',
	['==', ['get', 'vt_sngldbl'], '駅部分'],
	'rgb(255,255,255)',
	['match', ['get', 'vt_rtcode'], '地下鉄', 'rgba(0,155,191,1)', 'rgb(180, 180, 180)']
];

/** 駅ククリの共通 line-width */
const railStationKukriWidth: ExpressionSpecification = [
	'let',
	'width',
	['+', 400, ['*', railWidthByRtcode, railDoubleMul]],
	[
		'interpolate',
		['exponential', 2],
		['zoom'],
		0,
		[
			'match',
			['get', 'vt_rtcode'],
			'JR',
			['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 5, 4],
			'索道',
			0.5,
			'特殊鉄道',
			0.5,
			['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 4, 3]
		],
		14,
		['*', ['^', 2, -8], ['var', 'width']],
		23,
		['var', 'width']
	]
];

/** 旗竿の共通 line-width */
const railFlagpoleWidth: ExpressionSpecification = [
	'let',
	'width',
	['*', 450, ['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 2, 1]],
	[
		'interpolate',
		['exponential', 2],
		['zoom'],
		0,
		5,
		14,
		['*', ['^', 2, -8], ['var', 'width']],
		23,
		['var', 'width']
	]
];

/** 橋ククリ黒の共通 line-width */
const railBridgeKukriBlackWidth: ExpressionSpecification = [
	'let',
	'width',
	['+', 500, ['*', railWidthByRtcode, ['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 2, 1]]],
	[
		'interpolate',
		['exponential', 2],
		['zoom'],
		14,
		['*', ['^', 2, -8], ['var', 'width']],
		23,
		['*', ['match', ['get', 'vt_rtcode'], 'JR以外', 0.6, '地下鉄', 0.6, 1], ['var', 'width']]
	]
];

/** 橋ククリ白の共通 line-width */
const railBridgeKukriWhiteWidth: ExpressionSpecification = [
	'let',
	'width',
	['+', 300, ['*', railWidthByRtcode, ['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 2, 1]]],
	[
		'interpolate',
		['exponential', 2],
		['zoom'],
		14,
		['*', ['^', 2, -8], ['var', 'width']],
		23,
		['*', ['match', ['get', 'vt_rtcode'], 'JR以外', 0.6, '地下鉄', 0.6, 1], ['var', 'width']]
	]
];

/** 橋駅ククリの共通 line-width */
const railBridgeStationKukriWidth: ExpressionSpecification = [
	'let',
	'width',
	['+', 400, ['*', railWidthByRtcode, railDoubleMul]],
	[
		'interpolate',
		['exponential', 2],
		['zoom'],
		0,
		[
			'match',
			['get', 'vt_rtcode'],
			'JR',
			['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 5, 3],
			'索道',
			0.5,
			'特殊鉄道',
			0.5,
			['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 3, 2]
		],
		14,
		['*', ['^', 2, -8], ['var', 'width']],
		23,
		['*', ['match', ['get', 'vt_rtcode'], 'JR以外', 0.6, '地下鉄', 0.6, 1], ['var', 'width']]
	]
];

/** 非トンネル・非橋のフィルタ */
const notTunnelOrBridge: ExpressionSpecification = [
	'!',
	['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下', '橋・高架']]]
];

/** line-opacity */
const railLineOpacity: ExpressionSpecification = [
	'interpolate',
	['linear'],
	['zoom'],
	13,
	1,
	18,
	0.1
];

export const railLineLayers = [
	{
		id: '鉄道中心線ZL4-10',
		minzoom: 7,
		maxzoom: 11,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		paint: {
			'line-color': [
				'match',
				['get', 'vt_rtcode'],
				'地下鉄',
				'rgba(200,160,60,1)',
				'rgb(180, 180, 180)'
			],
			'line-opacity': ['match', ['get', 'vt_railstate'], ['トンネル', '地下'], 0.5, 1],
			'line-width': [
				'interpolate',
				['linear'],
				['zoom'],
				4,
				2,
				8,
				2,
				10,
				[
					'*',
					['case', ['==', ['get', 'vt_rtcode'], 'JR'], 2, 1.25],
					['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 2, 1]
				]
			]
		}
	},

	// --- 通常地上（非トンネル・非橋） ---
	{
		id: '鉄道中心線駅ククリ',
		minzoom: 11,
		maxzoom: 24,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['all', notTunnelOrBridge, ['==', ['get', 'vt_sngldbl'], '駅部分']],
		paint: {
			'line-color': 'rgb(180, 180, 180)',
			'line-width': railStationKukriWidth,
			'line-opacity': railLineOpacity
		}
	},
	{
		id: '鉄道中心線',
		minzoom: 11,
		maxzoom: 24,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['all', notTunnelOrBridge],
		paint: {
			'line-color': railCenterLineColor,
			'line-width': railCenterLineWidth,
			'line-opacity': railLineOpacity
		}
	},
	{
		id: '鉄道中心線旗竿',
		minzoom: 14,
		maxzoom: 24,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			['==', ['get', 'vt_rtcode'], 'JR'],
			notTunnelOrBridge,
			['!=', ['get', 'vt_sngldbl'], '駅部分']
		],
		paint: {
			'line-color': 'rgb(255,255,255)',
			'line-dasharray': ['literal', [5, 5]],
			'line-width': railFlagpoleWidth,
			'line-opacity': railLineOpacity
		}
	},

	// --- 橋・高架 ---
	{
		id: '鉄道中心線橋ククリ黒',
		minzoom: 15,
		maxzoom: 24,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['==', ['get', 'vt_railstate'], '橋・高架'],
		paint: {
			'line-color': 'rgba(0,0,0,1)',
			'line-opacity': ['interpolate', ['linear'], ['zoom'], 15, 0, 16, 1],
			'line-width': railBridgeKukriBlackWidth
		}
	},
	{
		id: '鉄道中心線橋ククリ白',
		minzoom: 14,
		maxzoom: 24,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['==', ['get', 'vt_railstate'], '橋・高架'],
		paint: {
			'line-color': 'rgba(255,255,255,1)',
			'line-width': railBridgeKukriWhiteWidth,
			'line-opacity': railLineOpacity
		}
	},
	{
		id: '鉄道中心線橋駅ククリ',
		minzoom: 11,
		maxzoom: 24,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			['==', ['get', 'vt_railstate'], '橋・高架'],
			['==', ['get', 'vt_sngldbl'], '駅部分']
		],
		paint: {
			'line-color': 'rgb(180, 180, 180)',
			'line-width': railBridgeStationKukriWidth,
			'line-opacity': railLineOpacity
		}
	},
	{
		id: '鉄道中心線橋',
		minzoom: 11,
		maxzoom: 24,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['==', ['get', 'vt_railstate'], '橋・高架'],
		paint: {
			'line-color': railCenterLineColor,
			'line-width': railCenterLineWidth,
			'line-opacity': railLineOpacity
		}
	},
	{
		id: '鉄道中心線旗竿橋',
		minzoom: 14,
		maxzoom: 24,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			['==', ['get', 'vt_rtcode'], 'JR'],
			['==', ['get', 'vt_railstate'], '橋・高架'],
			['!=', ['get', 'vt_sngldbl'], '駅部分']
		],
		paint: {
			'line-color': 'rgb(255,255,255)',
			'line-dasharray': ['literal', [5, 5]],
			'line-width': railFlagpoleWidth,
			'line-opacity': railLineOpacity
		}
	},

	// --- 地下・トンネル ---
	{
		id: '鉄道中心線地下トンネルククリ',
		minzoom: 11,
		maxzoom: 24,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'step',
			['zoom'],
			[
				'all',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下']]],
				['==', ['get', 'vt_sngldbl'], '駅部分'],
				['any', ['!', ['has', 'vt_flag17']], ['in', ['get', 'vt_flag17'], ['literal', [0, 1]]]]
			],
			17,
			[
				'all',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下']]],
				['==', ['get', 'vt_sngldbl'], '駅部分'],
				['in', ['get', 'vt_flag17'], ['literal', [1, 2]]]
			]
		],
		paint: {
			'line-color': [
				'match',
				['get', 'vt_rtcode'],
				'地下鉄',
				'rgba(255,255,255,1)',
				'rgb(180, 180, 180)'
			],
			'line-opacity': [
				'case',
				['==', ['get', 'vt_sngldbl'], '駅部分'],
				1,
				['case', ['==', ['get', 'vt_railstate'], '雪覆い'], 0.75, 0.5]
			],
			'line-width': [
				'let',
				'width',
				[
					'+',
					['case', ['==', ['get', 'vt_sngldbl'], '駅部分'], 1000, 0],
					['*', railWidthByRtcode, railDoubleMul]
				],
				[
					'interpolate',
					['exponential', 2],
					['zoom'],
					0,
					['case', ['==', ['get', 'vt_rtcode'], 'JR'], 5, 3],
					14,
					['*', ['^', 2, -9], ['var', 'width']],
					23,
					['var', 'width']
				]
			]
		}
	},
	{
		id: '鉄道中心線地下トンネル',
		minzoom: 11,
		maxzoom: 24,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'step',
			['zoom'],
			[
				'all',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下']]],
				['any', ['!', ['has', 'vt_flag17']], ['in', ['get', 'vt_flag17'], ['literal', [0, 1]]]]
			],
			17,
			[
				'all',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下']]],
				['in', ['get', 'vt_flag17'], ['literal', [1, 2]]]
			]
		],
		paint: {
			'line-color': [
				'match',
				['get', 'vt_rtcode'],
				'地下鉄',
				'rgba(0,155,191,1)',
				['case', ['==', ['get', 'vt_sngldbl'], '駅部分'], 'rgb(173,173,173)', 'rgb(180, 180, 180)']
			],
			'line-opacity': [
				'case',
				['==', ['get', 'vt_sngldbl'], '駅部分'],
				1,
				['case', ['==', ['get', 'vt_railstate'], '雪覆い'], 0.75, 0.5]
			],
			'line-width': [
				'let',
				'width',
				[
					'+',
					['case', ['==', ['get', 'vt_sngldbl'], '駅部分'], 800, 0],
					['*', railWidthByRtcode, railDoubleMul]
				],
				[
					'interpolate',
					['exponential', 2],
					['zoom'],
					0,
					['case', ['==', ['get', 'vt_rtcode'], 'JR'], 5, 3],
					14,
					['*', ['^', 2, -9], ['var', 'width']],
					23,
					['var', 'width']
				]
			]
		}
	}
];
