import { TOKYO_23KU_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { ENTRY_PMTILES_VECTOR_PATH, MAP_IMAGE_BASE_PATH } from '$routes/constants';

import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';

import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: 'omt_building',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Polygon',
		url: 'https://tile.openstreetmap.jp/static/planet.pmtiles'
	},
	metaData: {
		name: 'OSM 建物データ',
		attribution: 'OMT',
		downloadUrl: 'https://wiki.openstreetmap.org/wiki/Japan/OSMFJ_Tileserver',
		description: '',
		location: '全国',
		tags: ['建物'],
		minZoom: 13,
		maxZoom: 14,
		sourceLayer: 'building',
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		xyzImageTile: { x: 14550, y: 6452, z: 14 }
		// mapImage: `${MAP_IMAGE_BASE_PATH}/plateau_lod2_mvt.webp`
	},
	properties: {
		attributeView: {
			popupKeys: ['render_height', 'render_min_height', 'colour', 'hide_3d'],
			titles: [
				{
					conditions: [],
					template: 'OTM 建物データ'
				}
			]
		},
		fields: [
			{
				key: 'render_height',
				type: 'number',
				label: '建物の高さ',
				unit: 'm'
			},
			{
				key: 'render_min_height',
				type: 'number',
				label: '建物の一部の下端の最低高さ',
				unit: 'm'
			},
			{
				key: 'colour',
				type: 'string',
				label: '色'
			},
			{
				key: 'hide_3d',
				type: 'boolean',
				label: '3D表示を非表示にするか'
			}
		]
	},
	interaction: {
		clickable: false
	},
	style: {
		type: 'fill',
		opacity: 1,
		colors: {
			key: '単色',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#a6cee3',
						pattern: null
					}
				},
				{
					type: 'step',
					key: 'render_height',
					name: '高さごとの色分け',
					mapping: {
						scheme: 'YlOrRd',
						range: [0, 100],
						divisions: 5
					}
				}
			]
		},
		extrusion: {
			show: true,
			height: {
				key: 'render_height',
				expressions: [
					{
						type: 'single',
						key: 'single',
						name: '固定値',
						mapping: {
							value: 30
						}
					},
					{
						type: 'raw',
						key: 'render_height',
						name: '建物の高さ',
						mapping: {
							expression: ['*', ['get', 'render_height'], 1]
						}
					}
				]
			}
		},
		outline: {
			show: false,
			color: '#000000',
			width: 1,
			lineStyle: 'solid'
		},
		labels: {
			key: 'render_height',
			show: false,
			expressions: [
				{
					key: 'render_height',
					name: '建物の高さ'
				}
			]
		},
		default: {
			symbol: {
				paint: {
					'text-color': '#000000',
					'text-halo-color': '#FFFFFF',
					'text-halo-width': 1,
					'text-opacity': 1
				},
				layout: {
					'text-max-width': 12,
					'text-size': 12,
					'text-padding': 10
				}
			}
		}
	}
};

export default entry;
