import type { GeoJsonMetaData, PointEntry } from '$routes/data/types/vector';
import { COVER_IMAGE_BASE_PATH, ENTRY_FGB_PATH } from '$routes/constants';

const entry: PointEntry<GeoJsonMetaData> = {
	id: 'ensyurin_owl',
	type: 'vector',
	format: {
		type: 'fgb',
		geometryType: 'Point',
		url: `${ENTRY_FGB_PATH}/ensyurin_owl.fgb`
	},
	metaData: {
		name: 'OWL利用研修立木計測データ',
		description: '林業専攻-OWL利用研修立木計測データ',
		attribution: '株式会社アドイン研究所',
		location: '森林文化アカデミー',
		maxZoom: 22,
		coverImage: `${COVER_IMAGE_BASE_PATH}/owl.webp`
	},
	properties: {
		keys: ['樹種'],
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
		opacity: 0.8, // 透過率
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
			}
		}
	}
};

export default entry;
