import { MAP_IMAGE_BASE_PATH } from '$routes/constants';
import { TOKYO_23KU_BBOX } from '$routes/map/data/location_bbox';

import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: 'plateau_lod2_mvt',
	type: 'vector',
	format: {
		type: 'mvt',
		geometryType: 'Polygon',
		url: 'https://indigo-lab.github.io/plateau-lod2-mvt/{z}/{x}/{y}.pbf'
	},
	metaData: {
		name: '3D都市モデル 東京都23区 LOD2',
		attribution: 'PLATEAU',
		downloadUrl: 'https://github.com/indigo-lab/plateau-lod2-mvt?tab=readme-ov-file',
		description:
			'plateau-lod2-mvt by indigo-lab (国土交通省 Project PLATEAU のデータを加工して作成)',
		location: '東京都',
		tags: ['建物'],
		minZoom: 10,
		maxZoom: 16,
		sourceLayer: 'bldg',
		bounds: TOKYO_23KU_BBOX,
		xyzImageTile: { x: 29099, y: 12902, z: 15 },
		mapImage: `${MAP_IMAGE_BASE_PATH}/plateau_lod2_mvt.webp`
	},
	properties: {
		keys: [],
		titles: [
			{
				conditions: [],
				template: '3D都市モデル 東京都23区 LOD2'
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
					key: 'z',
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
				key: 'z',
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
						key: 'z',
						name: '建物の高さ',
						mapping: {
							expression: ['*', ['get', 'z'], 1]
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
			key: 'z',
			show: false,
			expressions: [
				{
					key: 'z',
					name: '建物の高さ',
					value: '{z} m'
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
