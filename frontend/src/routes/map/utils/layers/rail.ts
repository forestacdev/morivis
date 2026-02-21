export const rail = [
	{
		id: '鉄道中心線ZL4-10',
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
				'rgb(100,100,100)'
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

	{
		id: '鉄道中心線駅ククリ0',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			[
				'!',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下', '橋・高架']]]
			],
			['==', ['get', 'vt_sngldbl'], '駅部分'],
			['==', ['get', 'vt_lvorder'], 0]
		],
		paint: {
			'line-color': 'rgb(100,100,100)',
			'line-width': [
				'let',
				'width',
				[
					'+',
					400,
					[
						'*',
						[
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
						],
						['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
					]
				],
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
			]
		}
	},
	{
		id: '鉄道中心線0',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			[
				'!',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下', '橋・高架']]]
			],
			['==', ['get', 'vt_lvorder'], 0]
		],
		paint: {
			'line-color': [
				'case',
				['==', ['get', 'vt_sngldbl'], '駅部分'],
				'rgb(255,255,255)',
				['match', ['get', 'vt_rtcode'], '地下鉄', 'rgba(0,155,191,1)', 'rgb(100,100,100)']
			],
			'line-width': [
				'let',
				'width',
				[
					'*',
					[
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
					],
					['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
				],
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
			]
		}
	},
	{
		id: '鉄道中心線旗竿0',
		minzoom: 14,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			['==', ['get', 'vt_rtcode'], 'JR'],
			[
				'!',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下', '橋・高架']]]
			],
			['!=', ['get', 'vt_sngldbl'], '駅部分'],
			['==', ['get', 'vt_lvorder'], 0]
		],
		paint: {
			'line-color': 'rgb(255,255,255)',
			'line-dasharray': ['literal', [5, 5]],
			'line-width': [
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
			]
		}
	},

	{
		id: '鉄道中心線橋ククリ黒0',
		minzoom: 15,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['all', ['==', ['get', 'vt_railstate'], '橋・高架'], ['==', ['get', 'vt_lvorder'], 0]],
		paint: {
			'line-color': 'rgba(0,0,0,1)',
			'line-opacity': ['interpolate', ['linear'], ['zoom'], 15, 0, 16, 1],
			'line-width': [
				'let',
				'width',
				[
					'+',
					500,
					[
						'*',
						[
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
						],
						['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 2, 1]
					]
				],
				[
					'interpolate',
					['exponential', 2],
					['zoom'],
					14,
					['*', ['^', 2, -8], ['var', 'width']],
					23,
					['*', ['match', ['get', 'vt_rtcode'], 'JR以外', 0.6, '地下鉄', 0.6, 1], ['var', 'width']]
				]
			]
		}
	},
	{
		id: '鉄道中心線橋ククリ白0',
		minzoom: 14,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['all', ['==', ['get', 'vt_railstate'], '橋・高架'], ['==', ['get', 'vt_lvorder'], 0]],
		paint: {
			'line-color': 'rgba(255,255,255,1)',
			'line-width': [
				'let',
				'width',
				[
					'+',
					300,
					[
						'*',
						[
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
						],
						['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 2, 1]
					]
				],
				[
					'interpolate',
					['exponential', 2],
					['zoom'],
					14,
					['*', ['^', 2, -8], ['var', 'width']],
					23,
					['*', ['match', ['get', 'vt_rtcode'], 'JR以外', 0.6, '地下鉄', 0.6, 1], ['var', 'width']]
				]
			]
		}
	},
	{
		id: '鉄道中心線橋駅ククリ0',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			['==', ['get', 'vt_railstate'], '橋・高架'],
			['==', ['get', 'vt_sngldbl'], '駅部分'],
			['==', ['get', 'vt_lvorder'], 0]
		],
		paint: {
			'line-color': 'rgb(100,100,100)',
			'line-width': [
				'let',
				'width',
				[
					'+',
					400,
					[
						'*',
						[
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
						],
						['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
					]
				],
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
			]
		}
	},
	{
		id: '鉄道中心線橋0',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['all', ['==', ['get', 'vt_railstate'], '橋・高架'], ['==', ['get', 'vt_lvorder'], 0]],
		paint: {
			'line-color': [
				'case',
				['==', ['get', 'vt_sngldbl'], '駅部分'],
				'rgb(255,255,255)',
				['match', ['get', 'vt_rtcode'], '地下鉄', 'rgba(0,155,191,1)', 'rgb(100,100,100)']
			],
			'line-width': [
				'let',
				'width',
				[
					'*',
					[
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
					],
					['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
				],
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
			]
		}
	},
	{
		id: '鉄道中心線旗竿橋0',
		minzoom: 14,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			['==', ['get', 'vt_rtcode'], 'JR'],
			['in', ['get', 'vt_railstate'], '橋・高架'],
			['!=', ['get', 'vt_sngldbl'], '駅部分'],
			['==', ['get', 'vt_lvorder'], 0]
		],
		paint: {
			'line-color': 'rgb(255,255,255)',
			'line-dasharray': ['literal', [5, 5]],
			'line-width': [
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
			]
		}
	},

	{
		id: '鉄道中心線駅ククリ1',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			[
				'!',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下', '橋・高架']]]
			],
			['==', ['get', 'vt_sngldbl'], '駅部分'],
			['==', ['get', 'vt_lvorder'], 1]
		],
		paint: {
			'line-color': 'rgb(100,100,100)',
			'line-width': [
				'let',
				'width',
				[
					'+',
					400,
					[
						'*',
						[
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
						],
						['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
					]
				],
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
					['*', ['match', ['get', 'vt_rtcode'], 'JR以外', 0.6, '地下鉄', 0.6, 1], ['var', 'width']]
				]
			]
		}
	},
	{
		id: '鉄道中心線1',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			[
				'!',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下', '橋・高架']]]
			],
			['==', ['get', 'vt_lvorder'], 1]
		],
		paint: {
			'line-color': [
				'case',
				['==', ['get', 'vt_sngldbl'], '駅部分'],
				'rgb(255,255,255)',
				['match', ['get', 'vt_rtcode'], '地下鉄', 'rgba(0,155,191,1)', 'rgb(100,100,100)']
			],
			'line-width': [
				'let',
				'width',
				[
					'*',
					[
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
					],
					['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
				],
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
			]
		}
	},
	{
		id: '鉄道中心線旗竿1',
		minzoom: 14,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			['==', ['get', 'vt_rtcode'], 'JR'],
			[
				'!',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下', '橋・高架']]]
			],
			['!=', ['get', 'vt_sngldbl'], '駅部分'],
			['==', ['get', 'vt_lvorder'], 1]
		],
		paint: {
			'line-color': 'rgb(255,255,255)',
			'line-dasharray': ['literal', [5, 5]],
			'line-width': [
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
			]
		}
	},

	{
		id: '鉄道中心線橋ククリ黒1',
		minzoom: 15,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['all', ['==', ['get', 'vt_railstate'], '橋・高架'], ['==', ['get', 'vt_lvorder'], 1]],
		paint: {
			'line-color': 'rgba(0,0,0,1)',
			'line-opacity': ['interpolate', ['linear'], ['zoom'], 15, 0, 16, 1],
			'line-width': [
				'let',
				'width',
				[
					'+',
					500,
					[
						'*',
						[
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
						],
						['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 2, 1]
					]
				],
				[
					'interpolate',
					['exponential', 2],
					['zoom'],
					14,
					['*', ['^', 2, -8], ['var', 'width']],
					23,
					['*', ['match', ['get', 'vt_rtcode'], 'JR以外', 0.6, '地下鉄', 0.6, 1], ['var', 'width']]
				]
			]
		}
	},
	{
		id: '鉄道中心線橋ククリ白1',
		minzoom: 14,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['all', ['==', ['get', 'vt_railstate'], '橋・高架'], ['==', ['get', 'vt_lvorder'], 1]],
		paint: {
			'line-color': 'rgba(255,255,255,1)',
			'line-width': [
				'let',
				'width',
				[
					'+',
					300,
					[
						'*',
						[
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
						],
						['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 2, 1]
					]
				],
				[
					'interpolate',
					['exponential', 2],
					['zoom'],
					14,
					['*', ['^', 2, -8], ['var', 'width']],
					23,
					['*', ['match', ['get', 'vt_rtcode'], 'JR以外', 0.6, '地下鉄', 0.6, 1], ['var', 'width']]
				]
			]
		}
	},
	{
		id: '鉄道中心線橋駅ククリ1',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			['==', ['get', 'vt_railstate'], '橋・高架'],
			['==', ['get', 'vt_sngldbl'], '駅部分'],
			['==', ['get', 'vt_lvorder'], 1]
		],
		paint: {
			'line-color': 'rgb(100,100,100)',
			'line-width': [
				'let',
				'width',
				[
					'+',
					400,
					[
						'*',
						[
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
						],
						['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
					]
				],
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
			]
		}
	},
	{
		id: '鉄道中心線橋1',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['all', ['==', ['get', 'vt_railstate'], '橋・高架'], ['==', ['get', 'vt_lvorder'], 1]],
		paint: {
			'line-color': [
				'case',
				['==', ['get', 'vt_sngldbl'], '駅部分'],
				'rgb(255,255,255)',
				['match', ['get', 'vt_rtcode'], '地下鉄', 'rgba(0,155,191,1)', 'rgb(100,100,100)']
			],
			'line-width': [
				'let',
				'width',
				[
					'*',
					[
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
					],
					['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
				],
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
			]
		}
	},
	{
		id: '鉄道中心線旗竿橋1',
		minzoom: 14,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			['==', ['get', 'vt_rtcode'], 'JR'],
			['in', ['get', 'vt_railstate'], '橋・高架'],
			['!=', ['get', 'vt_sngldbl'], '駅部分'],
			['==', ['get', 'vt_lvorder'], 1]
		],
		paint: {
			'line-color': 'rgb(255,255,255)',
			'line-dasharray': ['literal', [5, 5]],
			'line-width': [
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
			]
		}
	},

	{
		id: '鉄道中心線駅ククリ2',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			[
				'!',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下', '橋・高架']]]
			],
			['==', ['get', 'vt_sngldbl'], '駅部分'],
			['==', ['get', 'vt_lvorder'], 2]
		],
		paint: {
			'line-color': 'rgb(100,100,100)',
			'line-width': [
				'let',
				'width',
				[
					'+',
					400,
					[
						'*',
						[
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
						],
						['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
					]
				],
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
					['*', ['match', ['get', 'vt_rtcode'], 'JR以外', 0.6, '地下鉄', 0.6, 1], ['var', 'width']]
				]
			]
		}
	},
	{
		id: '鉄道中心線2',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			[
				'!',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下', '橋・高架']]]
			],
			['==', ['get', 'vt_lvorder'], 2]
		],
		paint: {
			'line-color': [
				'case',
				['==', ['get', 'vt_sngldbl'], '駅部分'],
				'rgb(255,255,255)',
				['match', ['get', 'vt_rtcode'], '地下鉄', 'rgba(0,155,191,1)', 'rgb(100,100,100)']
			],
			'line-width': [
				'let',
				'width',
				[
					'*',
					[
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
					],
					['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
				],
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
			]
		}
	},
	{
		id: '鉄道中心線旗竿2',
		minzoom: 14,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			['==', ['get', 'vt_rtcode'], 'JR'],
			[
				'!',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下', '橋・高架']]]
			],
			['!=', ['get', 'vt_sngldbl'], '駅部分'],
			['==', ['get', 'vt_lvorder'], 2]
		],
		paint: {
			'line-color': 'rgb(255,255,255)',
			'line-dasharray': ['literal', [5, 5]],
			'line-width': [
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
			]
		}
	},
	{
		id: '鉄道中心線橋ククリ黒2',
		minzoom: 15,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['all', ['==', ['get', 'vt_railstate'], '橋・高架'], ['==', ['get', 'vt_lvorder'], 2]],
		paint: {
			'line-color': 'rgba(0,0,0,1)',
			'line-opacity': ['interpolate', ['linear'], ['zoom'], 15, 0, 16, 1],
			'line-width': [
				'let',
				'width',
				[
					'+',
					500,
					[
						'*',
						[
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
						],
						['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 2, 1]
					]
				],
				[
					'interpolate',
					['exponential', 2],
					['zoom'],
					14,
					['*', ['^', 2, -8], ['var', 'width']],
					23,
					['*', ['match', ['get', 'vt_rtcode'], 'JR以外', 0.6, '地下鉄', 0.6, 1], ['var', 'width']]
				]
			]
		}
	},
	{
		id: '鉄道中心線橋ククリ白2',
		minzoom: 14,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['all', ['==', ['get', 'vt_railstate'], '橋・高架'], ['==', ['get', 'vt_lvorder'], 2]],
		paint: {
			'line-color': 'rgba(255,255,255,1)',
			'line-width': [
				'let',
				'width',
				[
					'+',
					300,
					[
						'*',
						[
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
						],
						['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 2, 1]
					]
				],
				[
					'interpolate',
					['exponential', 2],
					['zoom'],
					14,
					['*', ['^', 2, -8], ['var', 'width']],
					23,
					['*', ['match', ['get', 'vt_rtcode'], 'JR以外', 0.6, '地下鉄', 0.6, 1], ['var', 'width']]
				]
			]
		}
	},
	{
		id: '鉄道中心線橋駅ククリ2',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			['==', ['get', 'vt_railstate'], '橋・高架'],
			['==', ['get', 'vt_sngldbl'], '駅部分'],
			['==', ['get', 'vt_lvorder'], 2]
		],
		paint: {
			'line-color': 'rgb(100,100,100)',
			'line-width': [
				'let',
				'width',
				[
					'+',
					400,
					[
						'*',
						[
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
						],
						['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
					]
				],
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
			]
		}
	},
	{
		id: '鉄道中心線橋2',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['all', ['==', ['get', 'vt_railstate'], '橋・高架'], ['==', ['get', 'vt_lvorder'], 2]],
		paint: {
			'line-color': [
				'case',
				['==', ['get', 'vt_sngldbl'], '駅部分'],
				'rgb(255,255,255)',
				['match', ['get', 'vt_rtcode'], '地下鉄', 'rgba(0,155,191,1)', 'rgb(100,100,100)']
			],
			'line-width': [
				'let',
				'width',
				[
					'*',
					[
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
					],
					['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
				],
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
			]
		}
	},
	{
		id: '鉄道中心線旗竿橋2',
		minzoom: 14,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			['==', ['get', 'vt_rtcode'], 'JR'],
			['in', ['get', 'vt_railstate'], '橋・高架'],
			['!=', ['get', 'vt_sngldbl'], '駅部分'],
			['==', ['get', 'vt_lvorder'], 2]
		],
		paint: {
			'line-color': 'rgb(255,255,255)',
			'line-dasharray': ['literal', [5, 5]],
			'line-width': [
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
			]
		}
	},
	{
		id: '建築物2',
		type: 'fill',
		source: 'v',
		'source-layer': 'BldA',
		filter: ['==', ['get', 'vt_lvorder'], 2],
		paint: {
			'fill-color': [
				'match',
				['get', 'vt_code'],
				3101,
				'rgba(255,230,190,1)',
				3102,
				'rgba(255,187,153,1)',
				3103,
				'rgba(255,119,51,1)',
				3111,
				'rgba(255,187,153,1)',
				3112,
				'rgba(255,187,153,1)',
				'rgba(0,0,0,0)'
			]
		}
	},
	{
		id: '建築物の外周線2',
		type: 'line',
		source: 'v',
		'source-layer': 'BldA',
		filter: ['==', ['get', 'vt_lvorder'], 2],
		paint: {
			'line-color': [
				'match',
				['get', 'vt_code'],
				3101,
				'rgba(255,135,75,1)',
				3102,
				'rgba(255,135,75,1)',
				3103,
				'rgba(255,135,75,1)',
				3111,
				'rgba(255,135,75,1)',
				3112,
				'rgba(255,135,75,1)',
				'rgba(0,0,0,0)'
			],
			'line-width': ['match', ['get', 'vt_code'], 3101, 1, 3102, 1, 3103, 1, 3111, 1, 3112, 1, 0]
		}
	},

	{
		id: '鉄道中心線駅ククリ3',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			[
				'!',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下', '橋・高架']]]
			],
			['==', ['get', 'vt_sngldbl'], '駅部分'],
			['==', ['get', 'vt_lvorder'], 3]
		],
		paint: {
			'line-color': 'rgb(100,100,100)',
			'line-width': [
				'let',
				'width',
				[
					'+',
					400,
					[
						'*',
						[
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
						],
						['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
					]
				],
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
					['*', ['match', ['get', 'vt_rtcode'], 'JR以外', 0.6, '地下鉄', 0.6, 1], ['var', 'width']]
				]
			]
		}
	},
	{
		id: '鉄道中心線3',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			[
				'!',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下', '橋・高架']]]
			],
			['==', ['get', 'vt_lvorder'], 3]
		],
		paint: {
			'line-color': [
				'case',
				['==', ['get', 'vt_sngldbl'], '駅部分'],
				'rgb(255,255,255)',
				['match', ['get', 'vt_rtcode'], '地下鉄', 'rgba(0,155,191,1)', 'rgb(100,100,100)']
			],
			'line-width': [
				'let',
				'width',
				[
					'*',
					[
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
					],
					['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
				],
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
			]
		}
	},
	{
		id: '鉄道中心線旗竿3',
		minzoom: 14,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			['==', ['get', 'vt_rtcode'], 'JR'],
			[
				'!',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下', '橋・高架']]]
			],
			['!=', ['get', 'vt_sngldbl'], '駅部分'],
			['==', ['get', 'vt_lvorder'], 3]
		],
		paint: {
			'line-color': 'rgb(255,255,255)',
			'line-dasharray': ['literal', [5, 5]],
			'line-width': [
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
			]
		}
	},

	{
		id: '鉄道中心線橋ククリ黒3',
		minzoom: 15,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['all', ['==', ['get', 'vt_railstate'], '橋・高架'], ['==', ['get', 'vt_lvorder'], 3]],
		paint: {
			'line-color': 'rgba(0,0,0,1)',
			'line-opacity': ['interpolate', ['linear'], ['zoom'], 15, 0, 16, 1],
			'line-width': [
				'let',
				'width',
				[
					'+',
					500,
					[
						'*',
						[
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
						],
						['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 2, 1]
					]
				],
				[
					'interpolate',
					['exponential', 2],
					['zoom'],
					14,
					['*', ['^', 2, -8], ['var', 'width']],
					23,
					['*', ['match', ['get', 'vt_rtcode'], 'JR以外', 0.6, '地下鉄', 0.6, 1], ['var', 'width']]
				]
			]
		}
	},
	{
		id: '鉄道中心線橋ククリ白3',
		minzoom: 14,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['all', ['==', ['get', 'vt_railstate'], '橋・高架'], ['==', ['get', 'vt_lvorder'], 3]],
		paint: {
			'line-color': 'rgba(255,255,255,1)',
			'line-width': [
				'let',
				'width',
				[
					'+',
					300,
					[
						'*',
						[
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
						],
						['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 2, 1]
					]
				],
				[
					'interpolate',
					['exponential', 2],
					['zoom'],
					14,
					['*', ['^', 2, -8], ['var', 'width']],
					23,
					['*', ['match', ['get', 'vt_rtcode'], 'JR以外', 0.6, '地下鉄', 0.6, 1], ['var', 'width']]
				]
			]
		}
	},
	{
		id: '鉄道中心線橋駅ククリ3',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			['==', ['get', 'vt_railstate'], '橋・高架'],
			['==', ['get', 'vt_sngldbl'], '駅部分'],
			['==', ['get', 'vt_lvorder'], 3]
		],
		paint: {
			'line-color': 'rgb(100,100,100)',
			'line-width': [
				'let',
				'width',
				[
					'+',
					400,
					[
						'*',
						[
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
						],
						['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
					]
				],
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
			]
		}
	},
	{
		id: '鉄道中心線橋3',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['all', ['==', ['get', 'vt_railstate'], '橋・高架'], ['==', ['get', 'vt_lvorder'], 3]],
		paint: {
			'line-color': [
				'case',
				['==', ['get', 'vt_sngldbl'], '駅部分'],
				'rgb(255,255,255)',
				['match', ['get', 'vt_rtcode'], '地下鉄', 'rgba(0,155,191,1)', 'rgb(100,100,100)']
			],
			'line-width': [
				'let',
				'width',
				[
					'*',
					[
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
					],
					['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
				],
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
			]
		}
	},
	{
		id: '鉄道中心線旗竿橋3',
		minzoom: 14,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			['==', ['get', 'vt_rtcode'], 'JR'],
			['in', ['get', 'vt_railstate'], '橋・高架'],
			['!=', ['get', 'vt_sngldbl'], '駅部分'],
			['==', ['get', 'vt_lvorder'], 3]
		],
		paint: {
			'line-color': 'rgb(255,255,255)',
			'line-dasharray': ['literal', [5, 5]],
			'line-width': [
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
			]
		}
	},
	{
		id: '建築物3',
		type: 'fill',
		source: 'v',
		'source-layer': 'BldA',
		filter: ['==', ['get', 'vt_lvorder'], 3],
		paint: {
			'fill-color': [
				'match',
				['get', 'vt_code'],
				3101,
				'rgba(255,230,190,1)',
				3102,
				'rgba(255,187,153,1)',
				3103,
				'rgba(255,119,51,1)',
				3111,
				'rgba(255,187,153,1)',
				3112,
				'rgba(255,187,153,1)',
				'rgba(0,0,0,0)'
			]
		}
	},
	{
		id: '建築物の外周線3',
		type: 'line',
		source: 'v',
		'source-layer': 'BldA',
		filter: ['==', ['get', 'vt_lvorder'], 3],
		paint: {
			'line-color': [
				'match',
				['get', 'vt_code'],
				3101,
				'rgba(255,135,75,1)',
				3102,
				'rgba(255,135,75,1)',
				3103,
				'rgba(255,135,75,1)',
				3111,
				'rgba(255,135,75,1)',
				3112,
				'rgba(255,135,75,1)',
				'rgba(0,0,0,0)'
			],
			'line-width': ['match', ['get', 'vt_code'], 3101, 1, 3102, 1, 3103, 1, 3111, 1, 3112, 1, 0]
		}
	},

	{
		id: '鉄道中心線駅ククリ4',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			[
				'!',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下', '橋・高架']]]
			],
			['==', ['get', 'vt_sngldbl'], '駅部分'],
			['>=', ['get', 'vt_lvorder'], 4]
		],
		paint: {
			'line-color': 'rgb(100,100,100)',
			'line-width': [
				'let',
				'width',
				[
					'+',
					400,
					[
						'*',
						[
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
						],
						['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
					]
				],
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
					['*', ['match', ['get', 'vt_rtcode'], 'JR以外', 0.6, '地下鉄', 0.6, 1], ['var', 'width']]
				]
			]
		}
	},
	{
		id: '鉄道中心線4',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			[
				'!',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下', '橋・高架']]]
			],
			['>=', ['get', 'vt_lvorder'], 4]
		],
		paint: {
			'line-color': [
				'case',
				['==', ['get', 'vt_sngldbl'], '駅部分'],
				'rgb(255,255,255)',
				['match', ['get', 'vt_rtcode'], '地下鉄', 'rgba(0,155,191,1)', 'rgb(100,100,100)']
			],
			'line-width': [
				'let',
				'width',
				[
					'*',
					[
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
					],
					['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
				],
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
			]
		}
	},
	{
		id: '鉄道中心線旗竿4',
		minzoom: 14,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			['>=', ['get', 'vt_rtcode'], 'JR'],
			[
				'!',
				['in', ['get', 'vt_railstate'], ['literal', ['トンネル', '雪覆い', '地下', '橋・高架']]]
			],
			['!=', ['get', 'vt_sngldbl'], '駅部分'],
			['==', ['get', 'vt_lvorder'], 4]
		],
		paint: {
			'line-color': 'rgb(255,255,255)',
			'line-dasharray': ['literal', [5, 5]],
			'line-width': [
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
			]
		}
	},

	{
		id: '鉄道中心線橋ククリ黒4',
		minzoom: 15,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['all', ['>=', ['get', 'vt_railstate'], '橋・高架'], ['==', ['get', 'vt_lvorder'], 4]],
		paint: {
			'line-color': 'rgba(0,0,0,1)',
			'line-opacity': ['interpolate', ['linear'], ['zoom'], 15, 0, 16, 1],
			'line-width': [
				'let',
				'width',
				[
					'+',
					500,
					[
						'*',
						[
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
						],
						['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 2, 1]
					]
				],
				[
					'interpolate',
					['exponential', 2],
					['zoom'],
					14,
					['*', ['^', 2, -8], ['var', 'width']],
					23,
					['*', ['match', ['get', 'vt_rtcode'], 'JR以外', 0.6, '地下鉄', 0.6, 1], ['var', 'width']]
				]
			]
		}
	},
	{
		id: '鉄道中心線橋ククリ白4',
		minzoom: 14,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['all', ['>=', ['get', 'vt_railstate'], '橋・高架'], ['==', ['get', 'vt_lvorder'], 4]],
		paint: {
			'line-color': 'rgba(255,255,255,1)',
			'line-width': [
				'let',
				'width',
				[
					'+',
					300,
					[
						'*',
						[
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
						],
						['case', ['==', ['get', 'vt_sngldbl'], '複線以上'], 2, 1]
					]
				],
				[
					'interpolate',
					['exponential', 2],
					['zoom'],
					14,
					['*', ['^', 2, -8], ['var', 'width']],
					23,
					['*', ['match', ['get', 'vt_rtcode'], 'JR以外', 0.6, '地下鉄', 0.6, 1], ['var', 'width']]
				]
			]
		}
	},
	{
		id: '鉄道中心線橋駅ククリ4',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			['==', ['get', 'vt_railstate'], '橋・高架'],
			['==', ['get', 'vt_sngldbl'], '駅部分'],
			['>=', ['get', 'vt_lvorder'], 4]
		],
		paint: {
			'line-color': 'rgb(100,100,100)',
			'line-width': [
				'let',
				'width',
				[
					'+',
					400,
					[
						'*',
						[
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
						],
						['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
					]
				],
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
			]
		}
	},
	{
		id: '鉄道中心線橋4',
		minzoom: 11,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: ['all', ['==', ['get', 'vt_railstate'], '橋・高架'], ['>=', ['get', 'vt_lvorder'], 4]],
		paint: {
			'line-color': [
				'case',
				['==', ['get', 'vt_sngldbl'], '駅部分'],
				'rgb(255,255,255)',
				['match', ['get', 'vt_rtcode'], '地下鉄', 'rgba(0,155,191,1)', 'rgb(100,100,100)']
			],
			'line-width': [
				'let',
				'width',
				[
					'*',
					[
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
					],
					['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
				],
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
			]
		}
	},
	{
		id: '鉄道中心線旗竿橋4',
		minzoom: 14,
		maxzoom: 17,
		type: 'line',
		source: 'v',
		'source-layer': 'RailCL',
		filter: [
			'all',
			['>=', ['get', 'vt_rtcode'], 'JR'],
			['in', ['get', 'vt_railstate'], '橋・高架'],
			['!=', ['get', 'vt_sngldbl'], '駅部分'],
			['==', ['get', 'vt_lvorder'], 4]
		],
		paint: {
			'line-color': 'rgb(255,255,255)',
			'line-dasharray': ['literal', [5, 5]],
			'line-width': [
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
			]
		}
	},
	{
		id: '建築物4',
		type: 'fill',
		source: 'v',
		'source-layer': 'BldA',
		filter: ['>=', ['get', 'vt_lvorder'], 4],
		paint: {
			'fill-color': [
				'match',
				['get', 'vt_code'],
				3101,
				'rgba(255,230,190,1)',
				3102,
				'rgba(255,187,153,1)',
				3103,
				'rgba(255,119,51,1)',
				3111,
				'rgba(255,187,153,1)',
				3112,
				'rgba(255,187,153,1)',
				'rgba(0,0,0,0)'
			]
		}
	},
	{
		id: '建築物の外周線4',
		type: 'line',
		source: 'v',
		'source-layer': 'BldA',
		filter: ['>=', ['get', 'vt_lvorder'], 4],
		paint: {
			'line-color': [
				'match',
				['get', 'vt_code'],
				3101,
				'rgba(255,135,75,1)',
				3102,
				'rgba(255,135,75,1)',
				3103,
				'rgba(255,135,75,1)',
				3111,
				'rgba(255,135,75,1)',
				3112,
				'rgba(255,135,75,1)',
				'rgba(0,0,0,0)'
			],
			'line-width': ['match', ['get', 'vt_code'], 3101, 1, 3102, 1, 3103, 1, 3111, 1, 3112, 1, 0]
		}
	},

	{
		id: '鉄道中心線地下トンネルククリ',
		minzoom: 11,
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
				'rgb(100,100,100)'
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
					[
						'*',
						[
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
						],
						['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
					]
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
				['case', ['==', ['get', 'vt_sngldbl'], '駅部分'], 'rgb(173,173,173)', 'rgb(100,100,100)']
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
					[
						'*',
						[
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
						],
						['case', ['in', ['get', 'vt_sngldbl'], ['literal', ['複線以上', '駅部分']]], 2, 1]
					]
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
