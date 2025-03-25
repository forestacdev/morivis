import type { GeoJsonMetaData, PointEntry } from '$routes/data/types/vector';
import { COVER_IMAGE_BASE_PATH } from '$routes/constants';
import { FEATURE_IMAGE_BASE_PATH } from '$routes/constants';

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
			clickable: true
		},
		style: {
			type: 'circle',
			opacity: 0.8, // 透過率
			colors: {
				show: true,
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
			radius: {
				key: '単一',
				expressions: [
					{
						type: 'single',
						key: '単一',
						name: '単一',
						mapping: {
							value: 8
						}
					}
				]
			},
			outline: {
				show: true,
				color: '#ffffff',
				width: 2
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
		}
	},
	{
		id: 'fac_building',
		type: 'vector',
		format: {
			type: 'fgb',
			geometryType: 'Point',
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
			clickable: true
		},
		style: {
			type: 'circle',
			opacity: 1,
			colors: {
				show: false,
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
			outline: {
				show: false,
				color: '#ffffff',
				width: 2
			},
			radius: {
				key: '単一',
				expressions: [
					{
						type: 'single',
						key: '単一',
						name: '単一',
						mapping: {
							value: 8
						}
					}
				]
			},
			icon: {
				show: true,
				size: 0.1
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
				circle: {
					paint: {},
					layout: {}
				},
				symbol: {
					layout: {
						'text-field': ['to-string', ['get', 'name']],
						'text-size': 14,
						'text-variable-anchor': ['bottom-left', 'bottom-right'],
						'text-radial-offset': 2.1,
						'text-justify': 'auto'
						// 'icon-image': ['get', '_prop_id'],
						// 'icon-size': 0.1,
						// 'icon-anchor': 'bottom'
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
		}
	},
	{
		id: 'fac_ziriki',
		type: 'vector',
		format: {
			type: 'fgb',
			geometryType: 'Point',
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
			clickable: true
		},
		style: {
			type: 'circle',
			opacity: 1,
			colors: {
				show: false,
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
			outline: {
				show: false,
				color: '#ffffff',
				width: 2
			},
			radius: {
				key: '単一',
				expressions: [
					{
						type: 'single',
						key: '単一',
						name: '単一',
						mapping: {
							value: 8
						}
					}
				]
			},
			icon: {
				show: true,
				size: 0.1
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
				circle: {
					paint: {},
					layout: {}
				},
				symbol: {
					layout: {
						'text-field': ['to-string', ['get', 'name']],
						'text-size': 14,
						'text-variable-anchor': ['bottom-left', 'bottom-right'],
						'text-radial-offset': 2,
						'text-justify': 'auto'
					},
					paint: {
						'text-halo-color': '#ffffff',
						'text-halo-width': 2
					}
				}
			}
		}
	},
	{
		id: 'fac_poi',
		type: 'vector',
		format: {
			type: 'fgb',
			geometryType: 'Point',
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
			clickable: true
		},
		style: {
			type: 'circle',
			opacity: 1,
			colors: {
				show: false,
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
			radius: {
				key: '単一',
				expressions: [
					{
						type: 'single',
						key: '単一',
						name: '単一',
						mapping: {
							value: 8
						}
					}
				]
			},
			outline: {
				show: true,
				color: '#ffffff',
				width: 2
			},
			icon: {
				show: true,
				size: 0.1
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
				circle: {
					paint: {},
					layout: {}
				},
				symbol: {
					layout: {
						'text-field': ['to-string', ['get', 'name']],
						'text-size': 14,
						'text-variable-anchor': ['bottom-left', 'bottom-right'],
						'text-radial-offset': 2,
						'text-justify': 'auto',
						'icon-image': ['get', '_prop_id'],
						'icon-size': 0.1,
						'icon-anchor': 'bottom'
					},
					paint: {
						'text-halo-color': '#ffffff',
						'text-halo-width': 2
					}
				}
			}
		}
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
			clickable: true
		},
		style: {
			type: 'circle',
			opacity: 0.8, // 透過率
			colors: {
				show: true,
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
			radius: {
				key: '単一',
				expressions: [
					{
						type: 'single',
						key: '単一',
						name: '単一',
						mapping: {
							value: 8
						}
					}
				]
			},
			outline: {
				show: true,
				color: '#ffffff',
				width: 2
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
		}
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
			clickable: true
		},
		style: {
			type: 'circle',
			opacity: 0.8, // 透過率
			colors: {
				show: true,
				key: '樹高m',
				expressions: [
					{
						type: 'single',
						key: '単色',
						name: '単色',
						mapping: {
							value: '#e70000'
						}
					},
					{
						type: 'step',
						key: '樹高m',
						name: '樹高の範囲による色分け',
						mapping: {
							range: [4.0, 20],
							divisions: 6,
							values: ['#dcd69c', '#e20000']
						}
					}
				]
			},
			radius: {
				key: '胸高直径cm',
				expressions: [
					{
						type: 'single',
						key: '単一',
						name: '単一',
						mapping: {
							value: 8
						}
					},
					{
						type: 'linear',
						key: '胸高直径cm',
						name: '胸高直径',
						mapping: {
							range: [7, 42.5],
							values: [5, 10]
						}
					}
				]
			},
			outline: {
				show: true,
				color: '#ffffff',
				width: 2
			},
			labels: {
				key: '胸高直径cm',
				show: false,
				expressions: [
					{
						key: '胸高直径cm',
						name: '胸高直径cm',
						value: '{胸高直径cm}'
					}
				]
			},
			default: {
				circle: {
					paint: {
						// 'circle-stroke-width': 2,
						// 'circle-stroke-color': '#FFFFFF',
						// 'circle-color': [
						// 	'interpolate',
						// 	['linear'],
						// 	['get', '樹高m'],
						// 	4.1,
						// 	'hsl(52, 93%, 85%)',
						// 	18.7,
						// 	'hsl(0, 79%, 57%)'
						// ],
						// 'circle-radius': ['interpolate', ['linear'], ['get', '胸高直径cm'], 7, 5, 42.5, 10]
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
		}
	}
];
