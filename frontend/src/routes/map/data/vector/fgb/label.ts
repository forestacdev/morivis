import type { GeoJsonMetaData, LabelEntry } from '$map/data/types/vector';
import { COVER_IMAGE_BASE_PATH } from '$map/constants';
import { FEATURE_IMAGE_BASE_PATH } from '$map/constants';

export const fgbLabelEntry: LabelEntry<GeoJsonMetaData>[] = [
	// ポール

	{
		id: 'fac_building',
		type: 'vector',
		format: {
			type: 'fgb',
			geometryType: 'Label',
			url: './fgb/fac_building_point.fgb'
		},
		metaData: {
			name: 'アカデミー施設',
			description: '森林文化アカデミーの施設',
			attribution: '森林文化アカデミー',
			location: '森林文化アカデミー',
			maxZoom: 22,
			bounds: null,
			coverImage: `${FEATURE_IMAGE_BASE_PATH}/fac_center.webp`
		},
		properties: {
			keys: ['name', '建物名称', '構造規模'],
			dict: null,
			titles: [
				{
					conditions: ['name'],
					template: '{name}'
				},
				{
					conditions: [],
					template: '施設'
				}
			]
		},
		interaction: {
			clickable: true,
			searchKeys: ['name', '建物名称']
		},
		style: {
			type: 'symbol',
			opacity: 1,
			colors: {
				key: '単色',
				expressions: [
					{
						type: 'single',
						key: '単色',
						name: '単色',
						mapping: {
							value: '#000000'
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
						name: '建物名称',
						value: '{name}'
					}
				]
			},
			default: {
				symbol: {
					layout: {
						'text-field': ['to-string', ['get', 'name']],
						'text-size': 14,
						'text-variable-anchor': ['bottom-left', 'bottom-right'],
						'text-radial-offset': 2.1,
						'text-justify': 'auto',
						'icon-image': ['get', '_prop_id'],
						'icon-size': 0.25,
						'icon-anchor': 'bottom'
						// 'icon-image': [
						// 	'case',
						// 	['match', ['get', 'name'], ['森林総合教育センター(morinos)'], true, false],
						// 	'morinosuマーク',
						// 	['match', ['get', 'name'], ['アカデミーセンター'], true, false],
						// 	'アカデミーマークアイコン',
						// 	'dot-11'
						// ],
						// 'icon-size': [
						// 	'case',
						// 	['match', ['get', 'name'], ['森林総合教育センター(morinos)'], true, false],
						// 	0.4,
						// 	['match', ['get', 'name'], ['アカデミーセンター'], true, false],
						// 	0.3,
						// 	1
						// ]
					},
					paint: {
						'text-halo-color': '#ffffff',
						'text-halo-width': 2
					}
				}
			}
		},
		extension: {},
		debug: false
	},
	{
		id: 'fac_ziriki',
		type: 'vector',
		format: {
			type: 'fgb',
			geometryType: 'Label',
			url: './fgb/fac_ziriki_point.fgb'
		},
		metaData: {
			name: '自力建設',
			description: '自力建設',
			attribution: '森林文化アカデミー',
			location: '森林文化アカデミー',
			maxZoom: 22,
			bounds: null,
			coverImage: `${COVER_IMAGE_BASE_PATH}/ziriki.webp`
		},
		properties: {
			keys: ['name', '年度'],
			dict: null,
			titles: [
				{
					conditions: ['name'],
					template: '{name}'
				},
				{
					conditions: [],
					template: '自力建設'
				}
			]
		},
		interaction: {
			clickable: true,
			searchKeys: ['name', 'category']
		},
		style: {
			type: 'symbol',
			opacity: 1,
			colors: {
				key: '単色',
				expressions: [
					{
						type: 'single',
						key: '単色',
						name: '単色',
						mapping: {
							value: '#a03d00'
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
						name: '建物名称',
						value: '{name}'
					}
				]
			},
			default: {
				symbol: {
					layout: {
						'text-field': ['to-string', ['get', 'name']],
						'text-size': 14,
						'text-variable-anchor': ['bottom-left', 'bottom-right'],
						'text-radial-offset': 2,
						'text-justify': 'auto',
						'icon-image': ['get', '_prop_id'],
						'icon-size': 0.2,
						'icon-anchor': 'bottom'
					},
					paint: {
						'text-halo-color': '#ffffff',
						'text-halo-width': 2
					}
				}
			}
		},
		extension: {},
		debug: false
	},
	{
		id: 'fac_poi',
		type: 'vector',
		format: {
			type: 'fgb',
			geometryType: 'Label',
			url: './fgb/fac_poi.fgb'
		},
		metaData: {
			name: 'その他施設・林内ランドマーク',
			description: 'その他施設・林内ランドマーク',
			attribution: '森林文化アカデミー',
			location: '森林文化アカデミー',
			maxZoom: 22,
			bounds: null,
			coverImage: null
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
					template: 'その他施設・林内ランドマーク'
				}
			]
		},
		interaction: {
			clickable: true,
			searchKeys: ['name', '種類']
		},
		style: {
			type: 'symbol',
			opacity: 1,
			colors: {
				key: '単色',
				expressions: [
					{
						type: 'single',
						key: '単色',
						name: '単色',
						mapping: {
							value: '#c00a0a'
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
						name: '建物名称',
						value: '{name}'
					}
				]
			},
			default: {
				symbol: {
					layout: {
						'text-field': ['to-string', ['get', 'name']],
						'text-size': 14,
						'text-variable-anchor': ['bottom-left', 'bottom-right'],
						'text-radial-offset': 2,
						'text-justify': 'auto',
						'icon-image': ['get', '_prop_id'],
						'icon-size': 0.2,
						'icon-anchor': 'bottom'
					},
					paint: {
						'text-halo-color': '#ffffff',
						'text-halo-width': 2
					}
				}
			}
		},
		extension: {},
		debug: false
	}
];
