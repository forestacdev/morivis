import { FEATURE_IMAGE_BASE_PATH, ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
import type { VectorEntry, TileMetaData } from '$routes/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: 'fac_building_point',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Point',
		url: `${ENTRY_PMTILES_VECTOR_PATH}/fac_search.pmtiles`
	},
	metaData: {
		name: 'アカデミー施設',
		description: '森林文化アカデミーの施設',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		maxZoom: 14,
		minZoom: 1,
		sourceLayer: 'fac_building_point',
		bounds: [136.91764622017772, 35.553369893337134, 136.9198923648159, 35.55575869336596],
		coverImage: `${FEATURE_IMAGE_BASE_PATH}/fac_center.webp`
	},
	properties: {
		keys: ['name', '建物名称', '構造規模'],

		titles: [
			{
				conditions: ['name'],
				template: '{name}'
			},
			{
				conditions: [],
				template: '施設'
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
						value: '#000000'
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
					'text-radial-offset': 2.1,
					'text-justify': 'auto'
					// 'icon-image': ['get', '_prop_id'],
					// 'icon-size': 0.1,
					// 'icon-anchor': 'bottom'
					// 'icon-image': [
					// 	'case',
					// 	['match', ['get', 'name'], ['森林総合教育センター(morinos)'], true, false],
					// 	'morinosuマーク',
					// 	['match', ['get', 'name'], ['アカデミーセンター'], true, false],
					// 	'アカデミーマークアイコン',
					// 	'dot-11'
					// ],
					// 'icon-size': [
					// 	'case',
					// 	['match', ['get', 'name'], ['森林総合教育センター(morinos)'], true, false],
					// 	0.4,
					// 	['match', ['get', 'name'], ['アカデミーセンター'], true, false],
					// 	0.3,
					// 	1
					// ]
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
