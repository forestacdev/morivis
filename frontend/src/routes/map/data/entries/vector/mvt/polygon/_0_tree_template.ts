import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';
import { TREE_MATCH_COLOR_STYLE } from '$routes/map/data/style';
import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: '',
	type: 'vector',
	format: {
		type: 'mvt',
		geometryType: 'Polygon',
		url: ''
	},
	metaData: {
		name: '',
		attribution: 'カスタムデータ',
		downloadUrl: '',
		location: '不明',
		tags: [],
		minZoom: 8,
		maxZoom: 18,
		sourceLayer: '',
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_7
	},
	properties: {
		keys: [],
		titles: [
			{
				conditions: ['樹種'],
				template: '{樹種}'
			},
			{
				conditions: [],
				template: '兵庫県の樹種ポリゴン'
			}
		]
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'fill',
		opacity: 0.5,
		colors: {
			key: '解析樹種',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#349f1c',
						pattern: null
					}
				},
				{
					...TREE_MATCH_COLOR_STYLE
				},
				{
					type: 'step',
					key: '面積_ha',
					name: '面積ごとの色分け',
					mapping: {
						range: [0, 200],
						divisions: 5,
						values: ['#e0f7fa', '#ed006e']
					}
				}
			]
		},
		outline: {
			show: false,
			color: '#000000',
			width: 1,
			lineStyle: 'solid'
		},
		labels: {
			key: '樹種',
			show: false,
			expressions: []
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
