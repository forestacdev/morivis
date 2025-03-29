import type { VectorEntry, TileMetaData } from '$routes/data/types/vector/index';
// import { COVER_IMAGE_BASE_PATH } from '$routes/constants';

export const pmtilesPolygonEntry: VectorEntry<TileMetaData>[] = [
	{
		id: 'mino_geology',
		type: 'vector',
		format: {
			type: 'pmtiles',
			geometryType: 'Polygon',
			url: './pmtiles/mino_geology.pmtiles'
		},
		metaData: {
			name: '美濃市地質図',
			description: '美濃市地質図。',
			attribution: '産総研地質調査総合センター',
			location: '美濃市',
			minZoom: 0,
			maxZoom: 14,
			sourceLayer: 'geo_A',
			bounds: null,
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
	}
];

// import type { VectorEntry } from '$routes/data/types';
// import { GEOJSON_BASE_PATH, GIFU_DATA_BASE_PATH } from '$routes/constants';

// export const vectorPolygonEntries: VectorEntry<'polygon'>[] = [
// 	{
// 		id: 'gifu-mino-geology',
// 		name: '地質図',
// 		dataType: 'vector',
// 		geometryType: 'polygon',
// 		sourceLayer: 'geo_A',
// 		opacity: 0.7,
// 		url: 'https://raw.githubusercontent.com/forestacdev/vector-tiles-gifu-mino-geology/main/tiles/{z}/{x}/{y}.pbf',
// 		attribution: '産総研',
// 		sourceMaxZoom: 14,
// 		sourceMinZoom: 0,
// 		idField: 'MAJOR_CODE',
// 		visible: true,
// 		clickable: true,
// 		showFill: true,
// 		showLine: false,
// 		showSymbol: true,
// 		location: ['美濃市'],
// 		styleKey: 'デフォルト',
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
// 							['get', 'Symbol'],
// 							'a',
// 							'rgb(255, 255, 255)',
// 							'ts',
// 							'rgb(186, 208, 238)',
// 							'tl',
// 							'rgb(215, 226, 244)',
// 							'th',
// 							'rgb(231, 238, 229)',
// 							'A',
// 							'rgb(111, 77, 97)',
// 							'Ha',
// 							'rgb(160, 178, 79)',
// 							'Q',
// 							'rgb(234, 102, 69)',
// 							'D',
// 							'rgb(205, 99, 128)',
// 							'Kgr',
// 							'rgb(236, 101, 114)',
// 							'Au',
// 							'rgb(249, 158, 165)',
// 							'Al',
// 							'rgb(111, 106, 121)',
// 							'Kz',
// 							'rgb(209, 162, 132)',
// 							'Ktu',
// 							'rgb(213, 137, 133)',
// 							'Ktl',
// 							'rgb(249, 160, 156)',
// 							'Kou',
// 							'rgb(209, 162, 132)',
// 							'Kol',
// 							'rgb(255, 203, 164)',
// 							'Ta',
// 							'rgb(179, 167, 185)',
// 							'Ya',
// 							'rgb(255, 203, 164)',
// 							'Nmx',
// 							'rgb(200, 174, 155)',
// 							'Nmm',
// 							'rgb(221, 208, 170)',
// 							'Nbf',
// 							'rgb(206, 224, 223)',
// 							'Ncs',
// 							'rgb(255, 234, 137)',
// 							'Nss',
// 							'rgb(222, 212, 129)',
// 							'Nal',
// 							'rgb(181, 199, 131)',
// 							'Nms',
// 							'rgb(184, 208, 241)',
// 							'Nsi',
// 							'rgb(206, 203, 229)',
// 							'Ncl',
// 							'rgb(55, 74, 135)',
// 							'Nch',
// 							'rgb(246, 151, 74)',
// 							'Nto',
// 							'rgb(55, 94, 135)',
// 							'Nls',
// 							'rgb(58, 105, 186)',
// 							'Nbs',
// 							'rgb(53, 91, 70)',
// 							'Fmx',
// 							'rgb(200, 174, 155)',
// 							'Fss',
// 							'rgb(222, 212, 129)',
// 							'Fch',
// 							'rgb(246, 151, 74)',
// 							'Flc',
// 							'rgb(55, 74, 135)',
// 							'Fls',
// 							'rgb(58, 105, 186)',
// 							'Fbs',
// 							'rgb(53, 91, 70)',
// 							'Kmx',
// 							'rgb(200, 174, 155)',
// 							'Ksx',
// 							'rgb(176, 161, 150)',
// 							'Kss',
// 							'rgb(222, 212, 129)',
// 							'Kms',
// 							'rgb(184, 208, 241)',
// 							'Ksi',
// 							'rgb(206, 203, 229)',
// 							'Kch',
// 							'rgb(246, 151, 74)',
// 							'Kto',
// 							'rgb(55, 94, 135)',
// 							'Kls',
// 							'rgb(58, 105, 186)',
// 							'Kbs',
// 							'rgb(53, 91, 70)',
// 							'KAcgl',
// 							'rgb(185, 131, 63)',
// 							'KAss',
// 							'rgb(219, 209, 120)',
// 							'KAsi',
// 							'rgb(206, 203, 229)',
// 							'KAch',
// 							'rgb(246, 151, 74)',
// 							'KAto',
// 							'rgb(55, 94, 135)',
// 							'KAls',
// 							'rgb(58, 105, 186)',
// 							'KAbs',
// 							'rgb(53, 91, 70)',
// 							'Water',
// 							'rgb(214, 255, 255)',
// 							'rgb(0, 0, 0)' // デフォルトの色（該当しない場合）
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
// 			]
// 		}
// 	},
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
