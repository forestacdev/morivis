import { COVER_IMAGE_BASE_PATH, IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { HIROSHIMA_BBOX } from '$routes/map/data/location_bbox';
import { TREE_MATCH_COLOR_STYLE } from '$routes/map/data/style';
import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: 'hiroshima_tree_species',
	type: 'vector',
	format: {
		type: 'mvt',
		geometryType: 'Polygon',
		url: 'https://raw.githubusercontent.com/forestacdev/tiles-tree-species-hiroshima/main/tiles/{z}/{x}/{y}.pbf'
	},
	metaData: {
		name: '広島県 樹種ポリゴン',
		attribution: '広島県林業課（林野庁加工）',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/rinya-hiroshima-maptiles',
		location: '広島県',
		tags: [],
		minZoom: 8,
		maxZoom: 16,
		sourceLayer: 'tree_species_hiroshima',
		bounds: HIROSHIMA_BBOX,
		xyzImageTile: { x: 28450, y: 13023, z: 15 },
		coverImage: `${COVER_IMAGE_BASE_PATH}/hiroshima_tree_species.webp`
	},
	properties: {
		keys: [
			'樹種ID',
			'樹種',
			'面積_ha',
			'森林計測年',
			'森林計測法',
			'県code',
			'市町村code',
			'解析樹種ID',
			'解析樹種'
		],
		titles: [
			{
				conditions: ['樹種'],
				template: '{樹種}'
			},
			{
				conditions: [],
				template: '広島県の樹種ポリゴン'
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
					type: 'match',
					key: '解析樹種',
					name: '樹種ごとの色分け',
					mapping: {
						categories: ['スギ', 'ヒノキ類', 'マツ類', 'タケ', 'その他'],
						values: [
							'#33a02c',
							'#b2df8a',
							'#a6cee3',
							'#b15928',
							'#1f78b4' // その他（グレー）
						],
						// パターン情報
						patterns: [null, null, null, null, 'tmpoly-line-vertical-down-light-200-black']
					},
					noData: {
						value: 'transparent',
						pattern: null
					}
				},
				{
					type: 'step',
					key: '面積_ha',
					name: '面積ごとの色分け',
					mapping: {
						range: [0, 9380],
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
			expressions: [
				{
					key: '樹種ID',
					name: '樹種ID',
					value: '{樹種ID}'
				},
				{
					key: '樹種',
					name: '樹種',
					value: '{樹種}'
				},
				{
					key: '面積_ha',
					name: '面積',
					value: '{面積_ha} ha'
				},
				{
					key: '森林計測年',
					name: '森林計測年',
					value: '{森林計測年}'
				},
				{
					key: '森林計測法',
					name: '森林計測法',
					value: '{森林計測法}'
				},
				{
					key: '県code',
					name: '県code',
					value: '{県code}'
				},
				{
					key: '市町村code',
					name: '市町村code',
					value: '{市町村code}'
				},
				{
					key: '解析樹種ID',
					name: '解析樹種ID',
					value: '{解析樹種ID}'
				},
				{
					key: '解析樹種',
					name: '解析樹種',
					value: '{解析樹種}'
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
