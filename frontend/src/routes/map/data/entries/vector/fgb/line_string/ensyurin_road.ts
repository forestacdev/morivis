import {
	COVER_IMAGE_BASE_PATH,
	ENTRY_FGB_PATH,
	ENTRY_PMTILES_VECTOR_PATH
} from '$routes/constants';
import type { GeoJsonMetaData, LineStringEntry } from '$routes/map/data/types/vector';

const entry: LineStringEntry<GeoJsonMetaData> = {
	id: 'ensyurin_road',
	type: 'vector',
	format: {
		type: 'fgb',
		geometryType: 'LineString',
		url: `${ENTRY_FGB_PATH}/ensyurin_road.fgb`
	},
	metaData: {
		name: '演習林 道',
		description: '演習林内の歩道と林道のデータ',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		tags: ['森林歩道', '林道'],
		maxZoom: 17,
		minZoom: 8,
		bounds: [136.919335, 35.546981, 136.92684, 35.555131],
		coverImage: `${COVER_IMAGE_BASE_PATH}/ensyurin_road.webp`,
		xyzImageTile: { x: 115387, y: 51670, z: 17 }
	},
	properties: {
		keys: ['種類', '道の長さ_m'],
		titles: []
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'line',
		opacity: 0.7,
		colors: {
			show: true,
			key: '単色',
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#cacaca'
					}
				},
				{
					type: 'match',
					key: '種類',
					name: '歩道と林道',
					mapping: {
						categories: ['林道', '歩道'],
						values: ['#ffec42', '#e0e0e0']
					}
				}
			]
		},
		width: {
			key: '種類',
			expressions: [
				{
					type: 'single',
					key: '単一',
					name: '単一',
					mapping: {
						value: 5
					}
				},
				{
					type: 'match',
					key: '種類',
					name: '歩道と林道',
					mapping: {
						categories: ['林道', '歩道'],
						values: [10, 5]
					}
				}
			]
		},
		lineStyle: 'solid',
		labels: {
			key: '種類',
			show: false,
			expressions: [
				{
					key: '種類',
					name: '道の種類',
					value: '{種類}'
				},
				{
					key: '道の長さ_m',
					name: '道の長さ',
					value: '{道の長さ_m} m'
				}
			]
		},
		default: {
			line: {
				paint: {},
				layout: {
					'line-cap': 'round',
					'line-join': 'round'
				}
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
	}
};

export default entry;
