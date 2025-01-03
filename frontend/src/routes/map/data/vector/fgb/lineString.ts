import type { GeoJsonMetaData, LineStringEntry } from '$map/data/types/vector';

export const fgbLineStringEntry: LineStringEntry<GeoJsonMetaData>[] = [
	// 演習林道
	{
		id: 'ensyurin_road',
		type: 'vector',
		format: {
			type: 'fgb',
			geometryType: 'LineString',
			url: './fgb/ensyurin_road.fgb'
		},
		metaData: {
			name: '演習林の道',
			description: '演習林の道',
			attribution: '森林文化アカデミー',
			location: '森林文化アカデミー',
			maxZoom: 24,
			bounds: null
		},
		properties: {
			keys: ['種類'],
			dict: null
		},
		interaction: {
			clickable: true,
			searchKeys: ['種類']
		},
		style: {
			type: 'line',
			opacity: 0.8, // 透過率
			colors: {
				key: '単色',
				expressions: [
					{
						type: 'single',
						key: '単色',
						name: '単色',
						mapping: {
							value: '#898989'
						}
					},
					{
						type: 'match',
						key: '種類',
						name: '歩道と林道の色分け',
						mapping: {
							categories: ['林道', '歩道'],
							values: ['#b89300', '#4adddd']
						}
					}
				]
			},
			labels: {
				key: '種類',
				show: false,
				expressions: [
					{
						key: '種類',
						name: '道の種類',
						value: '{種類}'
					}
				]
			},
			default: {
				fill: {
					paint: {},
					layout: {}
				},
				line: {
					layout: {},
					paint: {
						'line-width': ['match', ['get', '種類'], '林道', 10, '歩道', 5, 5]
					}
				},
				circle: {
					paint: {},
					layout: {}
				},
				symbol: {
					paint: {},
					layout: {
						'text-size': 10,
						'symbol-placement': 'line',
						'symbol-spacing': 100
					}
				}
			}
		},
		extension: {},
		debug: false
	}
];
