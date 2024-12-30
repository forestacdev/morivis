import type { GeojsonEntry } from '$routes/map/data/types';
import { GEOJSON_BASE_PATH, GIFU_DATA_BASE_PATH } from '$routes/map/constants';

const geojsonPolygonEntries: GeojsonEntry<'polygon'>[] = [
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
		location: ['森林文化アカデミー'],
		style: {
			fill: {
				show: true,
				styleKey: '樹種ごとの色分け',
				color: {
					['単色']: {
						type: 'single',
						property: '',
						values: {
							default: '#2a826c'
						}
					},
					['樹種ごとの色分け']: {
						type: 'match',
						property: '樹種',
						values: {
							categories: {
								スギ: '#399210',
								ヒノキ: '#4ADDA5',
								アカマツ: '#DD2B2B',
								スラッシュマツ: '#B720BF',
								広葉樹: '#EBBC22',
								草地: '#2351E5',
								その他岩石: '#D98F34'
							},
							default: '#00000000',
							showCategories: [
								'スギ',
								'ヒノキ',
								'アカマツ',
								'スラッシュマツ',
								'広葉樹',
								'草地',
								'その他岩石'
							]
						}
					},
					['林班']: {
						type: 'match',
						property: '林班',
						values: {
							categories: {
								1: '#399210',
								2: '#4ADDA5',
								3: '#DD2B2B'
							},
							default: '#00000000',
							showCategories: ['1', '2', '3'] // 動的に生成
						}
					},
					['面積ごとの色分け']: {
						type: 'interpolate',
						property: '面積',
						values: {
							categories: {
								0: '#f8d5cc',
								1: '#6e40e6'
							},
							default: '#00000000',
							showCategories: ['0', '1']
						}
					},
					['林齢ごとの色分け']: {
						type: 'interpolate',
						property: '林齢',
						values: {
							categories: {
								0: '#f8d5cc',
								60: '#6e40e6'
							},
							default: '#00000000',
							showCategories: ['0', '60']
						}
					}
				}
			},
			line: {
				show: true,
				styleKey: 'デフォルト',
				color: {
					['デフォルト']: {
						type: 'single',
						property: '',
						values: {
							default: '#ffe600'
						}
					},
					['樹種ごとの色分け']: {
						type: 'match',
						property: '樹種',
						values: {
							categories: {
								スギ: '#399210',
								ヒノキ: '#4ADDA5',
								アカマツ: '#DD2B2B',
								スラッシュマツ: '#B720BF',
								広葉樹: '#EBBC22',
								草地: '#2351E5',
								その他岩石: '#D98F34'
							},
							default: '#00000000',
							showCategories: [
								'スギ',
								'ヒノキ',
								'アカマツ',
								'スラッシュマツ',
								'広葉樹',
								'草地',
								'その他岩石'
							]
						}
					}
				},
				linePattern: 'dashed',
				lineWidth: {
					type: 'default',
					values: {
						default: 2,
						custom: 2
					}
				},
				layout: {
					'line-join': 'round',
					'line-cap': 'round'
				}
			},
			symbol: {
				show: true,
				styleKey: 'デフォルト',
				color: {
					['デフォルト']: {
						type: 'single',
						property: '',
						values: {
							default: '#000000'
						}
					}
				},
				paint: {
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
		}
	}
	// {
	// 	id: 'TATEMONO',
	// 	name: '建物',
	// 	dataType: 'geojson',
	// 	geometryType: 'polygon',
	// 	opacity: 1,
	// 	url: `${GEOJSON_BASE_PATH}/TATEMONO.geojson`,
	// 	attribution: '森林文化アカデミー',
	// 	visible: true,
	// 	showSymbol: true,
	// 	showLine: false,
	// 	showFill: true,
	// 	clickable: true,
	// 	searchKeys: ['name'],
	// 	styleKey: '単色',
	// 	location: ['森林文化アカデミー'],
	// 	style: {
	// 		fill: [
	// 			{
	// 				name: '単色',
	// 				paint: {
	// 					'fill-color': '#444444'
	// 				}
	// 			}
	// 		],
	// 		line: [
	// 			{
	// 				name: 'デフォルト',
	// 				paint: {
	// 					'line-color': '#ff0000',
	// 					'line-width': 1.5
	// 				}
	// 			}
	// 		],
	// 		symbol: [
	// 			{
	// 				name: 'デフォルト',
	// 				paint: {
	// 					'text-halo-color': '#000000',
	// 					'text-halo-width': 2,
	// 					'text-opacity': 1,
	// 					'text-color': '#ffffff'
	// 				},
	// 				layout: {
	// 					visibility: 'visible',
	// 					'text-field': ['to-string', ['get', 'name']],
	// 					'text-size': 14,
	// 					'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
	// 					'text-radial-offset': 0.5,
	// 					'text-justify': 'auto'
	// 					// 'icon-image': ['to-string', ['get', 'image']]
	// 				}
	// 			}
	// 		]
	// 	}
	// },
	// {
	// 	id: 'ZIRIKI',
	// 	name: '自力建設',
	// 	dataType: 'geojson',
	// 	geometryType: 'polygon',
	// 	opacity: 1,
	// 	url: `${GEOJSON_BASE_PATH}/ZIRIKI.geojson`,
	// 	attribution: '森林文化アカデミー',
	// 	location: ['森林文化アカデミー'],
	// 	visible: true,
	// 	clickable: true,
	// 	searchKeys: ['name'],
	// 	showSymbol: true,
	// 	showLine: false,
	// 	showFill: true,
	// 	styleKey: '単色',
	// 	style: {
	// 		fill: [
	// 			{
	// 				name: '単色',
	// 				paint: {
	// 					'fill-color': '#8c3d00'
	// 				}
	// 			}
	// 		],
	// 		line: [
	// 			{
	// 				name: 'デフォルト',
	// 				paint: {
	// 					'line-color': '#ff0000',
	// 					'line-width': 1.5
	// 				}
	// 			}
	// 		],
	// 		symbol: [
	// 			{
	// 				name: 'デフォルト',
	// 				paint: {
	// 					'text-halo-color': '#000000',
	// 					'text-halo-width': 2,
	// 					'text-opacity': 1,
	// 					'text-color': '#ffffff'
	// 				},
	// 				layout: {
	// 					visibility: 'visible',
	// 					'text-field': ['to-string', ['get', 'name']],
	// 					'text-size': 14,
	// 					'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
	// 					'text-radial-offset': 0.5,
	// 					'text-justify': 'auto'
	// 					// 'icon-image': ['to-string', ['get', 'image']]
	// 				}
	// 			}
	// 		]
	// 	}
	// }
];

export { geojsonPolygonEntries };
