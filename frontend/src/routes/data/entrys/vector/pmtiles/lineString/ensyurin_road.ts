import { COVER_IMAGE_BASE_PATH } from '$routes/constants';

import type { TileMetaData, VectorEntry } from '$routes/data/types/vector';

const entry: VectorEntry<TileMetaData> = {
	id: 'ensyurin_road',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'LineString',
		url: './pmtiles/vector/ensyurin.pmtiles'
	},
	metaData: {
		name: '演習林の道',
		description: '演習林の道',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		maxZoom: 14,
		minZoom: 1,
		sourceLayer: 'ensyurin_road',
		bounds: null,
		coverImage: `${COVER_IMAGE_BASE_PATH}/ensyurin_road.webp`
	},
	properties: {
		keys: ['種類'],
		dict: null,
		titles: null
	},
	interaction: {
		clickable: false
	},
	style: {
		type: 'line',
		opacity: 0.8,
		colors: {
			show: true,
			key: '単色',
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#898989'
					}
				},
				{
					type: 'match',
					key: '種類',
					name: '歩道と林道の色分け',
					mapping: {
						categories: ['林道', '歩道'],
						values: ['#b89300', '#4adddd']
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
					name: '歩道と林道の太さ分け',
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
				}
			]
		},
		default: {
			line: {
				layout: {},
				paint: {
					// 'line-width': ['match', ['get', '種類'], '林道', 10, '歩道', 5, 5]
				}
			},
			circle: {
				paint: {},
				layout: {}
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
