import type { GeoJsonMetaData, PointEntry } from '$map/data/types/vector';

export const fgbPointEntry: PointEntry<GeoJsonMetaData>[] = [
	// 演習林道
	{
		id: 'ensyurin_pole',
		type: 'vector',
		format: {
			type: 'fgb',
			geometryType: 'Point',
			url: './fgb/ensyurin_pole.fgb'
		},
		metaData: {
			name: 'サインポール',
			description: '演習林内のサインポール',
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
			type: 'circle',
			opacity: 0.8, // 透過率
			colors: {
				key: '単色',
				expressions: [
					{
						type: 'single',
						key: '単色',
						name: '単色',
						mapping: {
							value: '#e70000'
						}
					}
				]
			},
			labels: {
				key: '名前',
				show: false,
				expressions: [
					{
						key: '名前',
						name: 'ポールの名前',
						value: '{名前}'
					}
				]
			},
			default: {
				circle: {
					paint: {},
					layout: {}
				},
				symbol: {
					paint: {},
					layout: {}
				},
				heatmap: {
					paint: {},
					layout: {}
				}
			}
		},
		extension: {},
		debug: false
	}
];
