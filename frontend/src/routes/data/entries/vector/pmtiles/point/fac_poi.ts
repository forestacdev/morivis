import { COVER_IMAGE_BASE_PATH, ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
import type { VectorEntry, TileMetaData } from '$routes/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: 'fac_poi',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Point',
		url: `${ENTRY_PMTILES_VECTOR_PATH}/fac_search.pmtiles`
	},
	metaData: {
		name: 'その他施設・林内ランドマーク',
		description: 'その他施設・林内ランドマーク',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		maxZoom: 14,
		minZoom: 1,
		sourceLayer: 'fac_poi',
		bounds: [136.9190129344606, 35.548385, 136.925213, 35.555474],
		coverImage: `${COVER_IMAGE_BASE_PATH}/fac_poi.webp`
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
		markerType: 'icon',
		colors: {
			show: true,
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
			size: 0.2
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
};

export default entry;
