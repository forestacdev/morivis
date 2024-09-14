import type { VectorEntry } from '$lib/data/types';
import { GEOJSON_BASE_PATH, GIFU_DATA_BASE_PATH } from '$lib/constants';

export const vectorPolygonEntries: VectorEntry<'polygon'>[] = [
	{
		id: 'gifu-mino-geology',
		name: '地質図',
		dataType: 'vector',
		geometryType: 'polygon',
		sourceLayer: 'geo_A',
		opacity: 0.7,
		url: 'https://raw.githubusercontent.com/forestacdev/vector-tiles-gifu-mino-geology/main/tiles/{z}/{x}/{y}.pbf',
		attribution: '産総研',
		sourceMaxZoom: 14,
		sourceMinZoom: 0,
		idField: 'MAJOR_CODE',
		visible: true,
		clickable: true,
		showFill: true,
		showLine: false,
		showLabel: true,
		location: ['美濃市'],
		styleKey: 'デフォルト',
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
			]
		}
	},
	{
		id: 'gifu-forestarea',
		name: '岐阜県森林地域',
		dataType: 'vector',
		geometryType: 'polygon',
		sourceLayer: 'a001210020160207',
		opacity: 0.7,
		url: GIFU_DATA_BASE_PATH + '/gml/A13-15_21/tiles/{z}/{x}/{y}.pbf',
		attribution: '国土数値情報',
		sourceMaxZoom: 14,
		sourceMinZoom: 0,
		clickable: true,
		visible: true,
		idField: 'A45_001',
		showFill: true,
		showLine: false,
		showLabel: true,
		location: ['岐阜県'],
		styleKey: '単色',
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
		dataType: 'vector',
		geometryType: 'polygon',
		sourceLayer: 'A4519_21',
		opacity: 0.7,
		url: GIFU_DATA_BASE_PATH + '/gml/A45-19_21/tiles/{z}/{x}/{y}.pbf',
		fieldDict: GIFU_DATA_BASE_PATH + '/gml/A45-19_21/prop_dict.json',
		attribution: '国土数値情報',
		sourceMaxZoom: 14,
		sourceMinZoom: 0,
		visible: true,
		clickable: true,
		idField: 'A45_001',
		showFill: true,
		showLine: false,
		showLabel: false,
		location: ['岐阜県'],
		styleKey: '単色',
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
		}
	},
	{
		id: 'tree_species_tochigi',
		name: '樹種ポリゴン',
		dataType: 'vector',
		geometryType: 'polygon',
		sourceLayer: 'tree_species_tochigi',
		opacity: 0.7,
		url: 'https://rinya-tochigi.geospatial.jp/2023/rinya/tile/tree_species/{z}/{x}/{y}.pbf',
		attribution: '林野庁',
		sourceMaxZoom: 18,
		sourceMinZoom: 8,
		visible: true,
		clickable: true,
		idField: '樹種ID',
		showFill: true,
		showLine: false,
		showLabel: false,
		location: ['栃木県'],
		styleKey: '樹種',
		style: {
			fill: [
				{
					name: '単色',
					paint: {
						'fill-color': '#ffffff'
					}
				},
				{
					name: '樹種',
					paint: {
						'fill-color': [
							'match',
							['get', '解析樹種ID'],
							'01',
							'#00cc66',
							'02',
							'#99ff66',
							'03',
							'#cc0000',
							'04',
							'#ff9966',
							'05',
							'#ffcc99',
							'06',
							'#cc6600',
							'07',
							'#cc00cc',
							'08',
							'#ffff99',
							'09',
							'#ff9933',
							'10',
							'#cc9900',
							'11',
							'#ffff00',
							'12',
							'#8000ff',
							'96',
							'#8db3e2',
							'97',
							'#ccff99',
							'98',
							'#ff80ff',
							'99',
							'#bfbfbf',
							'#bfbfbf' // デフォルトの色
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
						'text-field': ['to-string', ['get', '樹種']],
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
		}
	}
];
