import { COVER_IMAGE_BASE_PATH, ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
import type { VectorEntry, TileMetaData } from '$routes/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: 'fac_ziriki_point',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Point',
		url: `${ENTRY_PMTILES_VECTOR_PATH}/fac_search.pmtiles`
	},
	metaData: {
		name: '自力建設',
		description: '自力建設',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		maxZoom: 14,
		minZoom: 1,
		sourceLayer: 'fac_ziriki_point',
		bounds: [136.91669416774363, 35.552165704819075, 136.9232546722223, 35.55613247338581],
		coverImage: `${COVER_IMAGE_BASE_PATH}/ziriki.webp`
	},
	properties: {
		keys: ['name', '年度'],

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
						value: '#a03d00'
					}
				}
			]
		},
		outline: {
			show: true,
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
};

export default entry;
