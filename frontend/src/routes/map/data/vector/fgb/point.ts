import type { GeoJsonMetaData, PointEntry } from '$map/data/types/vector';

export const fgbPointEntry: PointEntry<GeoJsonMetaData>[] = [
	// ポール
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
			dict: null,
			imageKey: 'image'
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
	},
	{
		id: 'fac_phenology_2020',
		type: 'vector',
		format: {
			type: 'fgb',
			geometryType: 'Point',
			url: './fgb/fac_phenology_2020.fgb'
		},
		metaData: {
			name: 'フェノロジー調査_2020',
			description: '森林環境教育専攻のフェノロジー調査のデータ',
			attribution: '森林文化アカデミー',
			location: '森林文化アカデミー',
			maxZoom: 24,
			bounds: null
		},
		properties: {
			keys: ['種名'],
			dict: null
		},
		interaction: {
			clickable: true,
			searchKeys: ['種名']
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
							value: '#33ec00'
						}
					}
				]
			},
			labels: {
				key: '種名',
				show: false,
				expressions: [
					{
						key: '種名',
						name: '種名',
						value: '{種名}'
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
