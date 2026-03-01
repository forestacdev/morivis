import type { ExpressionSpecification, LineLayerSpecification } from 'maplibre-gl';

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

/** 橋ククリの共通 line-width */
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

/** 地下・トンネル用 line-opacity（既存のcase式 × railLineOpacityのフェード） */
const tunnelBaseOpacity: ExpressionSpecification = [
	'case',
	['==', ['get', 'vt_sngldbl'], '駅部分'],
	1,
	['case', ['==', ['get', 'vt_railstate'], '雪覆い'], 0.75, 0.5]
];

const railTunnelLineOpacity: ExpressionSpecification = [
	'interpolate',
	['linear'],
	['zoom'],
	13,
	tunnelBaseOpacity,
	18,
	['*', 0.1, tunnelBaseOpacity]
];

export const railLineLayers: LineLayerSpecification[] = [
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
		filter: [
			'all',
			['!', ['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下']]]],
			['==', ['get', 'vt_sngldbl'], '駅部分']
		],
		paint: {
			'line-color': 'rgb(180, 180, 180)',
			'line-width': railBridgeStationKukriWidth,
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
		filter: ['!', ['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下']]]],
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
			['!', ['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下']]]],
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
		id: '鉄道中心線橋ククリ',
		minzoom: 14,
		maxzoom: 24,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['==', ['get', 'vt_railstate'], '橋・高架'],
		paint: {
			'line-color': 'rgba(0,0,0,1)',
			'line-width': railBridgeKukriWhiteWidth,
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
			'all',
			['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下']]],
			['==', ['get', 'vt_sngldbl'], '駅部分']
		],
		paint: {
			'line-color': [
				'match',
				['get', 'vt_rtcode'],
				'地下鉄',
				'rgba(255,255,255,1)',
				'rgb(180, 180, 180)'
			],
			'line-opacity': railTunnelLineOpacity,
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
		filter: ['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下']]],
		paint: {
			'line-color': [
				'match',
				['get', 'vt_rtcode'],
				'地下鉄',
				'rgba(0,155,191,1)',
				['case', ['==', ['get', 'vt_sngldbl'], '駅部分'], 'rgb(173,173,173)', 'rgb(180, 180, 180)']
			],
			'line-opacity': railTunnelLineOpacity,
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
