import type { LayerEntry } from '$lib/data/types';
import { GEOJSON_BASE_PATH, GIFU_DATA_BASE_PATH } from '$lib/constants';

export const polygonEntries: LayerEntry[] = [
	{
		id: 'ENSYURIN_rinhanzu',
		name: '演習林林班図',
		type: 'geojson-polygon',
		opacity: 0.4,
		path: `${GEOJSON_BASE_PATH}/ENSYURIN_rinhanzu.geojson`,
		attribution: '森林文化アカデミー',
		visible: true,
		clickable: true,
		show_label: false,
		show_outline: false,
		show_fill: true,
		id_field: '小林班ID',
		style_key: '樹種ごとの色分け',
		style: {
			fill: [
				{
					name: '単色',
					paint: {
						'fill-color': '#2a826c'
					}
				},
				{
					name: '樹種ごとの色分け',
					paint: {
						'fill-color': [
							'match',
							['get', '樹種'],
							'スギ',
							'#399210', // スギ
							'ヒノキ',
							'#4ADDA5', // ヒノキ
							'アカマツ',
							'#DD2B2B', // アカマツ
							'スラッシュマツ',
							'#B720BF', // スラッシュマツ
							'広葉樹',
							'#EBBC22', // 広葉樹
							'草地',
							'#2351E5', // 草地
							'その他岩石',
							'#D98F34', // その他岩石
							'#000000' // デフォルトの色（該当しない場合）
						]
					}
				},
				{
					name: '林班',
					paint: {
						'fill-color': [
							'match',
							['get', '林班'],
							1,
							'#DD2B2B',
							2,
							'#0043a7', // ヒノキ
							3,
							'#f0e000', // アカマツ
							'#000000' // デフォルトの色（該当しない場合）
						]
					}
				},
				{
					name: 'スギ林',
					paint: {
						'fill-color': [
							'match',
							['get', '樹種'],
							'スギ',
							'#399210', // スギ
							'#000000' // デフォルトの色（該当しない場合）
						]
					}
				},
				{
					name: '面積ごとの色分け',
					paint: {
						// fill-color で連続値に基づいた色を設定
						'fill-color': [
							'interpolate',
							['linear'], // 線形補間
							['get', '面積'], // プロパティ 'density' に基づいて色を変える
							0,
							'#f8d5cc',
							1,
							'#6e40e6'
						]
					}
				}
			],
			line: [
				{
					name: 'デフォルト',
					layout: {
						'line-join': 'round',
						'line-cap': 'round'
					},
					paint: {
						'line-color': '#ffe600',
						'line-width': 2,
						'line-dasharray': [2, 2] // この部分で破線のパターンを指定
					}
				}
			],
			symbol: [
				{
					name: 'デフォルト',
					paint: {
						'text-color': '#000000',
						'text-halo-color': '#e0e0e0',
						'text-halo-width': 2,
						'text-opacity': 1
					},
					layout: {
						'text-field': [
							'match',
							['get', '樹種'],
							['広葉樹'],
							['to-string', ['concat', ['get', '小林班ID'], '\n', ['get', '樹種']]],
							['草地'],
							['to-string', ['concat', ['get', '小林班ID'], '\n', ['get', '樹種']]],
							['その他岩石'],
							['to-string', ['concat', ['get', '小林班ID'], '\n', ['get', '樹種']]],
							[
								'to-string',
								[
									'concat',
									['get', '小林班ID'],
									'\n',
									['get', '樹種'],
									' ',
									['+', ['get', '林齢'], 3],
									'年生'
								]
							]
						],
						'text-max-width': 12,
						'text-size': 12,
						'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
						'text-radial-offset': 0.5,
						'text-justify': 'auto'
					}
				}
			]
		}
	},
	{
		id: 'TATEMONO',
		name: '建物',
		type: 'geojson-polygon',
		opacity: 1,
		path: `${GEOJSON_BASE_PATH}/TATEMONO.geojson`,
		attribution: '森林文化アカデミー',
		visible: true,
		show_label: true,
		show_outline: false,
		show_fill: true,
		clickable: true,
		style_key: '単色',
		filter: ['all', ['match', ['get', 'カテゴリ'], ['建物', 'その他'], true, false]],
		style: {
			fill: [
				{
					name: '単色',
					paint: {
						'fill-color': '#444444'
					}
				}
			],
			line: [
				{
					name: 'デフォルト',
					paint: {
						'line-color': '#ff0000',
						'line-width': 1.5
					}
				}
			],
			symbol: [
				{
					name: 'デフォルト',
					paint: {
						'text-halo-color': '#000000',
						'text-halo-width': 2,
						'text-opacity': 1,
						'text-color': '#ffffff'
					},
					layout: {
						visibility: 'visible',
						'text-field': ['to-string', ['get', 'name']],
						'text-size': 14,
						'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
						'text-radial-offset': 0.5,
						'text-justify': 'auto'
						// 'icon-image': ['to-string', ['get', 'image']]
					}
				}
			]
		}
	},
	{
		id: 'ZIRIKI',
		name: '自力建設',
		type: 'geojson-polygon',
		opacity: 1,
		path: `${GEOJSON_BASE_PATH}/TATEMONO.geojson`,
		attribution: '森林文化アカデミー',
		visible: true,
		clickable: true,
		show_label: true,
		show_outline: false,
		show_fill: true,
		filter: ['all', ['match', ['get', 'カテゴリ'], ['自力建設'], true, false]],
		style_key: '単色',
		style: {
			fill: [
				{
					name: '単色',
					paint: {
						'fill-color': '#8c3d00'
					}
				}
			],
			line: [
				{
					name: 'デフォルト',
					paint: {
						'line-color': '#ff0000',
						'line-width': 1.5
					}
				}
			],
			symbol: [
				{
					name: 'デフォルト',
					paint: {
						'text-halo-color': '#000000',
						'text-halo-width': 2,
						'text-opacity': 1,
						'text-color': '#ffffff'
					},
					layout: {
						visibility: 'visible',
						'text-field': ['to-string', ['get', 'name']],
						'text-size': 14,
						'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
						'text-radial-offset': 0.5,
						'text-justify': 'auto'
						// 'icon-image': ['to-string', ['get', 'image']]
					}
				}
			]
		}
	},

	{
		id: 'gifu-mino-geology',
		name: '地質図',
		type: 'vector-polygon',
		source_layer: 'geo_A',
		opacity: 0.7,
		path: 'https://raw.githubusercontent.com/forestacdev/vector-tiles-gifu-mino-geology/main/tiles/{z}/{x}/{y}.pbf',
		attribution: '産総研',
		source_maxzoom: 14,
		source_minzoom: 0,
		id_field: 'MAJOR_CODE',
		visible: false,
		clickable: true,
		show_fill: true,
		show_outline: false,
		show_label: true,
		style_key: 'デフォルト',
		style: {
			fill: [
				{
					name: '単色',
					paint: {
						'fill-color': '#ffffff'
					}
				},
				{
					name: 'デフォルト',
					paint: {
						'fill-color': [
							'match',
							['get', 'Symbol'],
							'a',
							'rgb(255, 255, 255)',
							'ts',
							'rgb(186, 208, 238)',
							'tl',
							'rgb(215, 226, 244)',
							'th',
							'rgb(231, 238, 229)',
							'A',
							'rgb(111, 77, 97)',
							'Ha',
							'rgb(160, 178, 79)',
							'Q',
							'rgb(234, 102, 69)',
							'D',
							'rgb(205, 99, 128)',
							'Kgr',
							'rgb(236, 101, 114)',
							'Au',
							'rgb(249, 158, 165)',
							'Al',
							'rgb(111, 106, 121)',
							'Kz',
							'rgb(209, 162, 132)',
							'Ktu',
							'rgb(213, 137, 133)',
							'Ktl',
							'rgb(249, 160, 156)',
							'Kou',
							'rgb(209, 162, 132)',
							'Kol',
							'rgb(255, 203, 164)',
							'Ta',
							'rgb(179, 167, 185)',
							'Ya',
							'rgb(255, 203, 164)',
							'Nmx',
							'rgb(200, 174, 155)',
							'Nmm',
							'rgb(221, 208, 170)',
							'Nbf',
							'rgb(206, 224, 223)',
							'Ncs',
							'rgb(255, 234, 137)',
							'Nss',
							'rgb(222, 212, 129)',
							'Nal',
							'rgb(181, 199, 131)',
							'Nms',
							'rgb(184, 208, 241)',
							'Nsi',
							'rgb(206, 203, 229)',
							'Ncl',
							'rgb(55, 74, 135)',
							'Nch',
							'rgb(246, 151, 74)',
							'Nto',
							'rgb(55, 94, 135)',
							'Nls',
							'rgb(58, 105, 186)',
							'Nbs',
							'rgb(53, 91, 70)',
							'Fmx',
							'rgb(200, 174, 155)',
							'Fss',
							'rgb(222, 212, 129)',
							'Fch',
							'rgb(246, 151, 74)',
							'Flc',
							'rgb(55, 74, 135)',
							'Fls',
							'rgb(58, 105, 186)',
							'Fbs',
							'rgb(53, 91, 70)',
							'Kmx',
							'rgb(200, 174, 155)',
							'Ksx',
							'rgb(176, 161, 150)',
							'Kss',
							'rgb(222, 212, 129)',
							'Kms',
							'rgb(184, 208, 241)',
							'Ksi',
							'rgb(206, 203, 229)',
							'Kch',
							'rgb(246, 151, 74)',
							'Kto',
							'rgb(55, 94, 135)',
							'Kls',
							'rgb(58, 105, 186)',
							'Kbs',
							'rgb(53, 91, 70)',
							'KAcgl',
							'rgb(185, 131, 63)',
							'KAss',
							'rgb(219, 209, 120)',
							'KAsi',
							'rgb(206, 203, 229)',
							'KAch',
							'rgb(246, 151, 74)',
							'KAto',
							'rgb(55, 94, 135)',
							'KAls',
							'rgb(58, 105, 186)',
							'KAbs',
							'rgb(53, 91, 70)',
							'Water',
							'rgb(214, 255, 255)',
							'rgb(0, 0, 0)' // デフォルトの色（該当しない場合）
						]
					}
				}
			],
			line: [
				{
					name: '単色',
					paint: {
						'line-color': '#ff0000',
						'line-width': 1.5
					}
				}
			],
			symbol: []
		}
	},

	{
		id: 'gifu-forestarea',
		name: '岐阜県森林地域',
		type: 'vector-polygon',
		source_layer: 'a001210020160207',
		opacity: 0.7,
		path: GIFU_DATA_BASE_PATH + '/gml/A13-15_21/tiles/{z}/{x}/{y}.pbf',
		attribution: '国土数値情報',
		source_maxzoom: 14,
		source_minzoom: 0,
		clickable: true,
		visible: false,
		id_field: 'A45_001',
		show_fill: true,
		show_outline: false,
		show_label: true,
		style_key: '単色',
		style: {
			fill: [
				{
					name: '単色',
					paint: {
						'fill-color': '#0c7300'
					}
				}
			],
			line: [
				{
					name: '単色',
					paint: {
						'line-color': '#ff0000',
						'line-width': 1.5
					}
				}
			]
		}
	},
	{
		id: 'gifu-nationalforest',
		name: '岐阜県国有林',
		type: 'vector-polygon',
		source_layer: 'A4519_21',
		opacity: 0.7,
		path: GIFU_DATA_BASE_PATH + '/gml/A45-19_21/tiles/{z}/{x}/{y}.pbf',
		attribution: '国土数値情報',
		source_maxzoom: 14,
		source_minzoom: 0,
		visible: false,
		clickable: true,
		id_field: 'A45_001',
		show_fill: true,
		show_outline: false,
		show_label: false,
		style_key: '単色',
		style: {
			fill: [
				{
					name: '単色',
					paint: {
						'fill-color': '#ffffff'
					}
				},
				{
					name: 'デフォルト',
					paint: {
						'fill-color': [
							'match',
							['get', 'A45_015'],
							['スギ'],
							'#3a9310',
							['ヒノキ'],
							'#4adea5',
							['アカマツ'],
							'#DD2B2B',
							['他Ｌ'],
							'#ecbd22',
							['天ヒノキ'],
							'#34eac2',
							'#000000'
						]
					}
				}
			],
			line: [
				{
					name: '単色',
					paint: {
						'line-color': '#ff0000',
						'line-width': 1.5
					}
				}
			],
			symbol: [
				{
					name: 'デフォルト',
					layout: {
						'text-field': [
							'case',
							['match', ['get', 'A45_015'], ['他Ｌ'], true, false],
							['to-string', ['concat', ['get', 'A45_013'], '\n', '広葉樹']],
							[
								'match',
								['get', 'A45_011'],
								['3142_林班_イ', '3147_林班_イ', '3147_林班_ロ', '3149_林班_イ'],
								true,
								false
							],
							['to-string', ['get', 'A45_013']],
							[
								'to-string',
								[
									'concat',
									['get', 'A45_013'],
									'\n',
									['get', 'A45_015'],
									' ',
									['+', ['get', 'A45_017'], 3],
									'年生'
								]
							]
						],
						'text-max-width': 12,
						'text-size': 12,
						'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
						'text-radial-offset': 0.5,
						'text-justify': 'auto'
					},
					paint: {
						'text-color': '#000000',
						'text-halo-color': '#FFFFFF',
						'text-halo-width': 1,
						'text-opacity': 1
					}
				}
			]
		},
		prop_dict: GIFU_DATA_BASE_PATH + '/gml/A45-19_21/prop_dict.json'
	}
];
