import type { VectorEntry, TileMetaData } from '$routes/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: 'mino_geology',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Polygon',
		url: './pmtiles/vector/mino_geology.pmtiles'
	},
	metaData: {
		name: '美濃市地質図',
		description: '美濃市地質図。',
		attribution: '産総研地質調査総合センター',
		location: '美濃市',
		minZoom: 0,
		maxZoom: 14,
		sourceLayer: 'geo_A',
		bounds: [136.74706, 35.503199, 137.014386, 35.669838],
		coverImage: null
	},
	properties: {
		keys: [],
		dict: null,
		titles: [
			{
				conditions: ['Symbol'],
				template: '{Symbol}'
			},
			{
				conditions: [],
				template: '美濃市の地質'
			}
		]
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'fill',
		opacity: 0.5,
		colors: {
			key: 'Symbol',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#9f1c1c'
					}
				},
				{
					type: 'match',
					key: 'Symbol',
					name: '地質ごとの色分け',
					mapping: {
						categories: [
							'a',
							'ts',
							'tl',
							'th',
							'A',
							'Ha',
							'Q',
							'D',
							'Kgr',
							'Au',
							'Al',
							'Kz',
							'Ktu',
							'Ktl',
							'Kou',
							'Kol',
							'Ta',
							'Ya',
							'Nmx',
							'Nmm',
							'Nbf',
							'Ncs',
							'Nss',
							'Nal',
							'Nms',
							'Nsi',
							'Ncl',
							'Nch',
							'Nto',
							'Nls',
							'Nbs',
							'Fmx',
							'Fss',
							'Fch',
							'Flc',
							'Fls',
							'Fbs',
							'Kmx',
							'Ksx',
							'Kss',
							'Kms',
							'Ksi',
							'Kch',
							'Kto',
							'Kls',
							'Kbs',
							'KAcgl',
							'KAss',
							'KAsi',
							'KAch',
							'KAto',
							'KAls',
							'KAbs',
							'Water'
						],
						values: [
							'#ffffff',
							'#bad0ee',
							'#d7e2f4',
							'#e7eee5',
							'#6f4d61',
							'#a0b24f',
							'#ea6645',
							'#cd6380',
							'#ec6572',
							'#f99ea5',
							'#6f6a79',
							'#d1a284',
							'#d58985',
							'#f9a09c',
							'#d1a284',
							'#ffcba4',
							'#b3a7b9',
							'#ffcba4',
							'#c8ae9b',
							'#ddd0aa',
							'#cee0df',
							'#ffea89',
							'#ded481',
							'#b5c783',
							'#b8d0f1',
							'#cecbe5',
							'#374a87',
							'#f6974a',
							'#375e87',
							'#3a69ba',
							'#355b46',
							'#c8ae9b',
							'#ded481',
							'#f6974a',
							'#374a87',
							'#3a69ba',
							'#355b46',
							'#c8ae9b',
							'#b0a196',
							'#ded481',
							'#b8d0f1',
							'#cecbe5',
							'#f6974a',
							'#375e87',
							'#3a69ba',
							'#355b46',
							'#b9833f',
							'#dbd178',
							'#cecbe5',
							'#f6974a',
							'#375e87',
							'#3a69ba',
							'#355b46',
							'#d6ffff'
						]
					}
				}
			]
		},
		outline: {
			show: true,
			color: '#000000',
			width: 2,
			lineStyle: 'solid'
		},
		labels: {
			key: 'Symbol',
			show: true,
			expressions: [
				{
					key: 'Symbol',
					name: 'Symbolのラベル',
					value: '{Symbol}'
				}
			]
		},
		default: {
			fill: {
				paint: {},
				layout: {}
			},
			line: {
				paint: {},
				layout: {}
			},
			circle: {
				paint: {},
				layout: {}
			},
			symbol: {
				paint: {},
				layout: {}
			}
		}
	}
};

export default entry;

// 	{
// 		id: 'gifu-forestarea',
// 		name: '岐阜県森林地域',
// 		dataType: 'vector',
// 		geometryType: 'polygon',
// 		sourceLayer: 'a001210020160207',
// 		opacity: 0.7,
// 		url: GIFU_DATA_BASE_PATH + '/gml/A13-15_21/tiles/{z}/{x}/{y}.pbf',
// 		attribution: '国土数値情報',
// 		sourceMaxZoom: 14,
// 		sourceMinZoom: 0,
// 		clickable: true,
// 		visible: true,
// 		idField: 'A45_001',
// 		showFill: true,
// 		showLine: false,
// 		showSymbol: true,
// 		location: ['岐阜県'],
// 		styleKey: '単色',
// 		style: {
// 			fill: [
// 				{
// 					name: '単色',
// 					paint: {
// 						'fill-color': '#0c7300'
// 					}
// 				}
// 			],
// 			line: [
// 				{
// 					name: '単色',
// 					paint: {
// 						'line-color': '#ff0000',
// 						'line-width': 1.5
// 					}
// 				}
// 			]
// 		}
// 	},
// 	{
// 		id: 'gifu-nationalforest',
// 		name: '岐阜県国有林',
// 		dataType: 'vector',
// 		geometryType: 'polygon',
// 		sourceLayer: 'A4519_21',
// 		opacity: 0.7,
// 		url: GIFU_DATA_BASE_PATH + '/gml/A45-19_21/tiles/{z}/{x}/{y}.pbf',
// 		fieldDict: GIFU_DATA_BASE_PATH + '/gml/A45-19_21/prop_dict.json',
// 		attribution: '国土数値情報',
// 		sourceMaxZoom: 14,
// 		sourceMinZoom: 0,
// 		visible: true,
// 		clickable: true,
// 		idField: 'A45_001',
// 		showFill: true,
// 		showLine: false,
// 		showSymbol: false,
// 		location: ['岐阜県'],
// 		styleKey: '単色',
// 		style: {
// 			fill: [
// 				{
// 					name: '単色',
// 					paint: {
// 						'fill-color': '#ffffff'
// 					}
// 				},
// 				{
// 					name: 'デフォルト',
// 					paint: {
// 						'fill-color': [
// 							'match',
// 							['get', 'A45_015'],
// 							['スギ'],
// 							'#3a9310',
// 							['ヒノキ'],
// 							'#4adea5',
// 							['アカマツ'],
// 							'#DD2B2B',
// 							['他Ｌ'],
// 							'#ecbd22',
// 							['天ヒノキ'],
// 							'#34eac2',
// 							'#000000'
// 						]
// 					}
// 				}
// 			],
// 			line: [
// 				{
// 					name: '単色',
// 					paint: {
// 						'line-color': '#ff0000',
// 						'line-width': 1.5
// 					}
// 				}
// 			],
// 			symbol: [
// 				{
// 					name: 'デフォルト',
// 					layout: {
// 						'text-field': [
// 							'case',
// 							['match', ['get', 'A45_015'], ['他Ｌ'], true, false],
// 							['to-string', ['concat', ['get', 'A45_013'], '\n', '広葉樹']],
// 							[
// 								'match',
// 								['get', 'A45_011'],
// 								['3142_林班_イ', '3147_林班_イ', '3147_林班_ロ', '3149_林班_イ'],
// 								true,
// 								false
// 							],
// 							['to-string', ['get', 'A45_013']],
// 							[
// 								'to-string',
// 								[
// 									'concat',
// 									['get', 'A45_013'],
// 									'\n',
// 									['get', 'A45_015'],
// 									' ',
// 									['+', ['get', 'A45_017'], 3],
// 									'年生'
// 								]
// 							]
// 						],
// 						'text-max-width': 12,
// 						'text-size': 12,
// 						'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
// 						'text-radial-offset': 0.5,
// 						'text-justify': 'auto'
// 					},
// 					paint: {
// 						'text-color': '#000000',
// 						'text-halo-color': '#FFFFFF',
// 						'text-halo-width': 1,
// 						'text-opacity': 1
// 					}
// 				}
// 			]
// 		}
// 	},

// ];
