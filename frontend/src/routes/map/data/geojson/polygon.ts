import type { GeojsonEntry } from '$routes/map/data/types';
import { GEOJSON_BASE_PATH, GIFU_DATA_BASE_PATH } from '$routes/map/constants';

export const geojsonPolygonEntries: GeojsonEntry<'polygon'>[] = [
	{
		id: 'ENSYURIN_rinhanzu',
		name: '演習林林班図',
		dataType: 'geojson',
		geometryType: 'polygon',
		opacity: 0.4,
		url: `${GEOJSON_BASE_PATH}/ENSYURIN_rinhanzu.geojson`,
		attribution: '森林文化アカデミー',
		visible: true,
		clickable: true,
		searchKeys: ['小林班ID', '樹種', '林齢'],
		showSymbol: false,
		showLine: false,
		showFill: true,
		location: ['森林文化アカデミー'],
		styleKey: '樹種ごとの色分け',
		style: {
			fill: [
				{
					name: '単色',
					color: '#2a826c',
					paint: {
						'fill-color': '#2a826c'
					}
				},
				{
					name: '樹種ごとの色分け',
                    color: {
                        'スギ': '#399210',
                        'ヒノキ': '#4ADDA5',
                        'アカマツ': '#DD2B2B',
                        'スラッシュマツ': '#B720BF',
                        '広葉樹': '#EBBC22',
                        '草地': '#2351E5',
                        'その他岩石': '#D98F34',
                        'その他': '#00000000'
                    }
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
							'#00000000' // デフォルトの色（該当しない場合）
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
							'#00000000' // デフォルトの色（該当しない場合）
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
							'#00000000' // デフォルトの色（該当しない場合）
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
		dataType: 'geojson',
		geometryType: 'polygon',
		opacity: 1,
		url: `${GEOJSON_BASE_PATH}/TATEMONO.geojson`,
		attribution: '森林文化アカデミー',
		visible: true,
		showSymbol: true,
		showLine: false,
		showFill: true,
		clickable: true,
		searchKeys: ['name'],
		styleKey: '単色',
		location: ['森林文化アカデミー'],
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
		dataType: 'geojson',
		geometryType: 'polygon',
		opacity: 1,
		url: `${GEOJSON_BASE_PATH}/ZIRIKI.geojson`,
		attribution: '森林文化アカデミー',
		location: ['森林文化アカデミー'],
		visible: true,
		clickable: true,
		searchKeys: ['name'],
		showSymbol: true,
		showLine: false,
		showFill: true,
		styleKey: '単色',
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
	}
];
