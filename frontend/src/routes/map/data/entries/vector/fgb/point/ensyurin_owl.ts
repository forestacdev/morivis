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
		attributeView: {
			popupKeys: [
				'樹種',
				'樹高m',
				'胸高直径cm',
				'材積m3',
				'幹周cm',
				'樹冠半径m',
				'矢高cm',
				'2cm括約胸高直径cm',
				'2cm括約材積m3',
				'バイオマスkg',
				'バイオマス（2cm括約）[kg]'
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
		fields: [
			{
				key: 'id',
				label: 'id'
			},
			{
				key: '矢高cm',
				label: '矢高',
				type: 'number',
				unit: 'cm'
			},
			{
				key: '材積m3',
				label: '材積',
				type: 'number',
				unit: 'm3'
			},
			{
				key: '樹冠半径m',
				label: '樹冠半径',
				type: 'number',
				unit: 'm'
			},
			{
				key: 'バイオマスkg',
				label: 'バイオマス',
				type: 'number',
				unit: 'kg'
			},
			{
				key: '樹高m',
				label: '樹高',
				type: 'number',
				unit: 'm'
			},
			{
				key: '2cm括約胸高直径cm',
				label: '2cm括約胸高直径',
				type: 'number',
				unit: 'cm'
			},
			{
				key: 'バイオマス（2cm括約）[kg]',
				label: 'バイオマス（2cm括約）',
				type: 'number',
				unit: 'kg'
			},
			{
				key: '樹種',
				label: '樹種'
			},
			{
				key: '2cm括約材積m3',
				label: '2cm括約材積',
				type: 'number',
				unit: 'm3'
			},
			{
				key: 'X',
				label: 'X'
			},
			{
				key: 'Y',
				label: 'Y'
			},
			{
				key: '幹周cm',
				label: '幹周',
				type: 'number',
				unit: 'cm'
			},
			{
				key: 'Z',
				label: 'Z'
			},
			{
				key: '胸高直径cm',
				label: '胸高直径',
				type: 'number',
				unit: 'cm'
			},
			{
				key: 'ID2',
				label: 'ID2'
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
						value: '#e31a1c'
					}
				},
				{
					type: 'step',
					key: '樹高m',
					name: '樹高の範囲による色分け',
					mapping: {
						scheme: 'YlOrRd',
						range: [4.0, 20],
						divisions: 6
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
					key: '矢高cm',
					name: '矢高'
				},
				{
					key: '材積m3',
					name: '材積'
				},
				{
					key: '樹冠半径m',
					name: '樹冠半径'
				},
				{
					key: 'バイオマスkg',
					name: 'バイオマス'
				},
				{
					key: '樹高m',
					name: '樹高'
				},
				{
					key: '2cm括約胸高直径cm',
					name: '2cm括約胸高直径cm'
				},
				{
					key: 'バイオマス（2cm括約）[kg]',
					name: 'バイオマス'
				},
				{
					key: '樹種',
					name: '樹種'
				},
				{
					key: '2cm括約材積m3',
					name: '2cm括約材積'
				},
				{
					key: '幹周cm',
					name: '幹周'
				},
				{
					key: '胸高直径cm',
					name: '胸高直径'
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
