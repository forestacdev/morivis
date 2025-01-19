import type { GeoJsonMetaData, PointEntry } from '$map/data/types/vector';
import { COVER_IMAGE_BASE_PATH } from '$map/constants';
import { FEATURE_IMAGE_BASE_PATH } from '$map/constants';

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
			maxZoom: 22,
			bounds: null,
			coverImage: `${FEATURE_IMAGE_BASE_PATH}/pole_3.webp`
		},
		properties: {
			keys: ['name'],
			dict: null,
			titles: [
				{
					conditions: ['name'],
					template: '{name}'
				},
				{
					conditions: [],
					template: 'サインポール'
				}
			]
		},
		interaction: {
			clickable: true,
			searchKeys: ['name']
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
						value: '{name}'
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
			maxZoom: 22,
			bounds: null,
			coverImage: `${COVER_IMAGE_BASE_PATH}/phenology_2020.webp`
		},
		properties: {
			keys: ['種名'],
			dict: null,
			titles: [
				{
					conditions: ['種名'],
					template: '{種名}'
				},
				{
					conditions: [],
					template: 'フェノロジー調査_2020のポイント'
				}
			]
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
	},
	{
		id: 'ensyurin_owl',
		type: 'vector',
		format: {
			type: 'fgb',
			geometryType: 'Point',
			url: './fgb/ensyurin_owl.fgb'
		},
		metaData: {
			name: '林業専攻-OWL利用研修立木計測データ',
			description: '林業専攻-OWL利用研修立木計測データ',
			attribution: '株式会社アドイン研究所',
			location: '森林文化アカデミー',
			maxZoom: 22,
			bounds: null,
			coverImage: `${COVER_IMAGE_BASE_PATH}/owl.webp`
		},
		properties: {
			keys: ['樹種'],
			dict: null,
			titles: [
				{
					conditions: ['樹種'],
					template: '{樹種}'
				},
				{
					conditions: [],
					template: '林業専攻-OWL利用研修立木計測データ'
				}
			]
		},
		interaction: {
			clickable: true,
			searchKeys: ['樹種']
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
						value: '{name}'
					}
				]
			},
			default: {
				circle: {
					paint: {
						'circle-stroke-width': 2,
						'circle-stroke-color': '#FFFFFF',
						'circle-color': [
							'interpolate',
							['linear'],
							['get', '樹高m'],
							4.1,
							'hsl(52, 93%, 85%)',
							18.7,
							'hsl(0, 79%, 57%)'
						],
						'circle-radius': ['interpolate', ['linear'], ['get', '胸高直径cm'], 7, 5, 42.5, 10]
						// "circle-opacity" :0
					},
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
