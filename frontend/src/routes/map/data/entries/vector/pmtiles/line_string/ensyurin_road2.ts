import { COVER_IMAGE_BASE_PATH, ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
import type { TileMetaData, VectorEntry } from '$routes/map/data/types/vector';

const entry: VectorEntry<TileMetaData> = {
	id: 'ensyurin_road2',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'LineString',
		url: `${ENTRY_PMTILES_VECTOR_PATH}/ensyurin.pmtiles`
	},
	metaData: {
		name: '演習林 歩道',
		description: '演習林',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		tags: ['森林歩道'],
		maxZoom: 17,
		minZoom: 8,
		sourceLayer: 'ensyurin_road2',
		bounds: [136.919335, 35.546981, 136.92684, 35.555131],
		coverImage: `${COVER_IMAGE_BASE_PATH}/ensyurin_road.webp`,
		xyzImageTile: { x: 115387, y: 51670, z: 17 }
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
