import { COVER_IMAGE_BASE_PATH, ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
import type { TileMetaData, VectorEntry } from '$routes/data/types/vector';

const entry: VectorEntry<TileMetaData> = {
	id: 'ensyurin_road2',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'LineString',
		url: `${ENTRY_PMTILES_VECTOR_PATH}/ensyurin.pmtiles`
	},
	metaData: {
		name: '演習林歩道',
		description: '演習林林道',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		maxZoom: 14,
		minZoom: 1,
		sourceLayer: 'ensyurin_road2',
		bounds: [136.919181, 35.546981, 136.92684, 35.555131],
		coverImage: `${COVER_IMAGE_BASE_PATH}/ensyurin_road.webp`
	},
	properties: {
		keys: [],
		titles: []
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
						value: '#cacaca'
					}
				}
			]
		},
		width: {
			key: '単一',
			expressions: [
				{
					type: 'single',
					key: '単一',
					name: '単一',
					mapping: {
						value: 5
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
