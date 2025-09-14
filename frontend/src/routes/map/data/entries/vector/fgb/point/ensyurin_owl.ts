import type { GeoJsonMetaData, PointEntry } from '$routes/map/data/types/vector';
import { COVER_IMAGE_BASE_PATH, ENTRY_FGB_PATH, MAP_IMAGE_BASE_PATH } from '$routes/constants';

const entry: PointEntry<GeoJsonMetaData> = {
	id: 'ensyurin_owl',
	type: 'vector',
	format: {
		type: 'fgb',
		geometryType: 'Point',
		url: `${ENTRY_FGB_PATH}/ensyurin_owl.fgb`
	},
	metaData: {
		name: '演習林 単木',
		description: '2021年度に実施した林業専攻のOWL利用研修立木計測データ。',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		minZoom: 10,
		maxZoom: 22,
		tags: ['森林', '単木'],
		bounds: [136.920923, 35.548695, 136.921198, 35.548997],
		xyzImageTile: { x: 923099, y: 413380, z: 20 },
		coverImage: `${COVER_IMAGE_BASE_PATH}/ensyurin_owl.webp`,
		mapImage: `${MAP_IMAGE_BASE_PATH}/ensyurin_owl.webp`
	},
	properties: {
		keys: [
			'id',
			'矢高cm',
			'材積m3',
			'樹冠半径m',
			'バイオマスkg',
			'樹高m',
			'2cm括約胸高直径cm',
			'バイオマス（2cm括約）[kg]',
			'樹種',
			'2cm括約材積m3',
			'X',
			'Y',
			'幹周cm',
			'Z',
			'胸高直径cm',
			'ID2'
		],
		titles: [
			{
				conditions: ['樹種'],
				template: '{樹種}'
			},
			{
				conditions: [],
				template: 'OWL利用研修立木計測データ'
			}
		]
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'circle',
		opacity: 0.7, // 透過率
		markerType: 'circle',
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
					key: 'id',
					name: 'id',
					value: '{id}'
				},
				{
					key: '矢高cm',
					name: '矢高',
					value: '{矢高cm} cm'
				},
				{
					key: '材積m3',
					name: '材積',
					value: '{材積m3} m3'
				},
				{
					key: '樹冠半径m',
					name: '樹冠半径',
					value: '{樹冠半径m} m'
				},
				{
					key: 'バイオマスkg',
					name: 'バイオマス',
					value: '{バイオマスkg}'
				},
				{
					key: '樹高m',
					name: '樹高',
					value: '{樹高m}m'
				},
				{
					key: '2cm括約胸高直径cm',
					name: '2cm括約胸高直径cm',
					value: '{2cm括約胸高直径cm}'
				},
				{
					key: 'バイオマス（2cm括約）[kg]',
					name: 'バイオマス',
					value: '{バイオマス（2cm括約）[kg]} kg'
				},
				{
					key: '樹種',
					name: '樹種',
					value: '{樹種}'
				},
				{
					key: '2cm括約材積m3',
					name: '2cm括約材積',
					value: '{2cm括約材積m3} m3'
				},

				{
					key: '幹周cm',
					name: '幹周',
					value: '{幹周cm} cm'
				},
				{
					key: '胸高直径cm',
					name: '胸高直径',
					value: '{胸高直径cm} cm'
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
			}
		}
	}
};

export default entry;
