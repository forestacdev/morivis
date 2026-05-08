import {
	COVER_IMAGE_BASE_PATH,
	ENTRY_PMTILES_VECTOR_PATH,
	ICON_IMAGE_BASE_PATH,
	MAP_IMAGE_BASE_PATH
} from '$routes/constants';
import type { TileMetaData, PointEntry } from '$routes/map/data/types/vector/index';
import { DEFAULT_POINT_LABEL_STYLE } from '$routes/map/data/entries/vector/_style';

const entry: PointEntry<TileMetaData> = {
	id: 'fac_poi_search',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Point',
		url: `${ENTRY_PMTILES_VECTOR_PATH}/fac_search.pmtiles`
	},
	metaData: {
		name: 'アカデミー施設等',
		description: '森林文化アカデミー周辺の施設データ',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		sourceLayer: 'fac_poi',
		minZoom: 11,
		maxZoom: 14,
		tags: ['建物'],
		bounds: [136.9158014095595, 35.547274216918595, 136.92711166333783, 35.55727434225648],
		coverImage: `${COVER_IMAGE_BASE_PATH}/fac_poi.webp`,
		mapImage: `${COVER_IMAGE_BASE_PATH}/fac_poi.webp`,
		xyzImageTile: { x: 14423, y: 6458, z: 14 }
	},
	properties: {
		fields: [
			{
				key: 'name',
				label: '名称',
				type: 'string'
			},
			{
				key: 'category',
				label: 'カテゴリ',
				type: 'string'
			}
		],
		attributeView: {
			popupKeys: ['name', 'category'],
			titles: [
				{
					conditions: ['name'],
					template: '{name}'
				},
				{
					conditions: [],
					template: 'アカデミー施設等'
				}
			]
		},
		images: {
			// popup: {
			// 	type: 'absolute',
			// 	urlKey: 'image'
			// },
			icon: {
				type: 'relative',
				imageIdKey: '_prop_id',
				urlKey: '_prop_id',
				baseUrl: `${ICON_IMAGE_BASE_PATH}/`,
				suffix: '.webp'
			}
		}
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'circle',
		opacity: 1, // 透過率
		colors: {
			show: true,
			key: '単色',
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#ff7f00',
						pattern: null
					}
				}
			]
		},
		imageIcon: {
			show: true
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
		labels: {
			key: 'name',
			show: false,
			minZoom: 12,
			expressions: [
				{
					key: 'name',
					name: '名称'
				},
				{
					key: 'category',
					name: 'カテゴリ'
				}
			]
		},
		default: {
			symbol: DEFAULT_POINT_LABEL_STYLE
		}
	},
	auxiliaryLayers: {
		sources: {
			fac_top: {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: [
						{
							type: 'Feature',
							properties: {
								name: '森林文化アカデミー',
								image: './mapicon.png',
								_prop_id: 'fac_top'
							},
							geometry: {
								type: 'Point',
								coordinates: [136.918564, 35.554467]
							}
						}
					]
				}
			}
		},
		layers: [
			{
				id: '@poi_top',
				type: 'symbol',
				source: 'fac_top',
				maxzoom: 12,
				minzoom: 4,
				layout: {
					'icon-image': 'poi_top',
					'icon-size': 0.8
				}
			}
		]
	}
};

export default entry;
