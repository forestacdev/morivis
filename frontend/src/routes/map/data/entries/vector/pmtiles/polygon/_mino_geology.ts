import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';
import { ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';

const entry: VectorEntry<TileMetaData> = {
	id: 'mino_geology',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Polygon',
		url: `${ENTRY_PMTILES_VECTOR_PATH}/mino_geology.pmtiles`
	},
	metaData: {
		name: '地質図 美濃市 ',
		description: '美濃市地質図。',
		attribution: '産総研地質調査総合センター',
		location: '岐阜県美濃市',
		tags: ['地質図'],
		minZoom: 0,
		maxZoom: 14,
		sourceLayer: 'geo_A',
		bounds: [136.74706, 35.503199, 137.014386, 35.669838]
	},
	properties: {
		keys: [],

		titles: [
			{
				conditions: ['Symbol'],
				template: '{Symbol}'
			},
			{
				conditions: [],
				template: '美濃市の地質'
			}
		]
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'fill',
		opacity: 0.5,
		colors: {
			key: 'Symbol',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#9f1c1c'
					}
				},
				{
					type: 'match',
					key: 'Symbol',
					name: '地質ごとの色分け',
					mapping: {
						categories: [
							'a',
							'ts',
							'tl',
							'th',
							'A',
							'Ha',
							'Q',
							'D',
							'Kgr',
							'Au',
							'Al',
							'Kz',
							'Ktu',
							'Ktl',
							'Kou',
							'Kol',
							'Ta',
							'Ya',
							'Nmx',
							'Nmm',
							'Nbf',
							'Ncs',
							'Nss',
							'Nal',
							'Nms',
							'Nsi',
							'Ncl',
							'Nch',
							'Nto',
							'Nls',
							'Nbs',
							'Fmx',
							'Fss',
							'Fch',
							'Flc',
							'Fls',
							'Fbs',
							'Kmx',
							'Ksx',
							'Kss',
							'Kms',
							'Ksi',
							'Kch',
							'Kto',
							'Kls',
							'Kbs',
							'KAcgl',
							'KAss',
							'KAsi',
							'KAch',
							'KAto',
							'KAls',
							'KAbs',
							'Water'
						],
						values: [
							'#ffffff',
							'#bad0ee',
							'#d7e2f4',
							'#e7eee5',
							'#6f4d61',
							'#a0b24f',
							'#ea6645',
							'#cd6380',
							'#ec6572',
							'#f99ea5',
							'#6f6a79',
							'#d1a284',
							'#d58985',
							'#f9a09c',
							'#d1a284',
							'#ffcba4',
							'#b3a7b9',
							'#ffcba4',
							'#c8ae9b',
							'#ddd0aa',
							'#cee0df',
							'#ffea89',
							'#ded481',
							'#b5c783',
							'#b8d0f1',
							'#cecbe5',
							'#374a87',
							'#f6974a',
							'#375e87',
							'#3a69ba',
							'#355b46',
							'#c8ae9b',
							'#ded481',
							'#f6974a',
							'#374a87',
							'#3a69ba',
							'#355b46',
							'#c8ae9b',
							'#b0a196',
							'#ded481',
							'#b8d0f1',
							'#cecbe5',
							'#f6974a',
							'#375e87',
							'#3a69ba',
							'#355b46',
							'#b9833f',
							'#dbd178',
							'#cecbe5',
							'#f6974a',
							'#375e87',
							'#3a69ba',
							'#355b46',
							'#d6ffff'
						]
					}
				}
			]
		},
		outline: {
			show: true,
			color: '#000000',
			width: 2,
			lineStyle: 'solid'
		},
		labels: {
			key: 'Symbol',
			show: true,
			expressions: [
				{
					key: 'Symbol',
					name: 'Symbol',
					value: '{Symbol}'
				}
			]
		},
		default: {
			fill: {
				paint: {},
				layout: {}
			},
			line: {
				paint: {},
				layout: {}
			},
			circle: {
				paint: {},
				layout: {}
			},
			symbol: {
				paint: {},
				layout: {}
			}
		}
	}
};

export default entry;
