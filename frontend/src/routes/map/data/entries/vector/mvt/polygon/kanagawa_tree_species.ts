import { MAP_IMAGE_BASE_PATH } from '$routes/constants';
import { KANAGAWA_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';

import {
	TREE_SPECIES_FIELDS,
	TREE_SPECIES_POPUP_KEYS,
	TREE_SPECIES_RELATIONS,
	TREE_SPECIES_TITLES,
	TREE_SPECIES_PROPERTIES
} from '$routes/map/data/entries/vector/_properties';
import {
	DEFAULT_POLYGON_STYLE,
	TREE_SPECIES_LABELS,
	TREE_SPECIES_OUTLINE,
	TREE_SPECIES_STYLE,
	TREE_SINGLE_COLOR_STYLE
} from '$routes/map/data/entries/vector/_style';

const entry: VectorEntry<TileMetaData> = {
	id: 'kanagawa_tree_species',
	type: 'vector',
	format: {
		type: 'mvt',
		geometryType: 'Polygon',
		url: 'https://raw.githubusercontent.com/forestacdev/tiles-tree-species-kanagawa/main/tiles/{z}/{x}/{y}.pbf'
	},
	metaData: {
		name: '神奈川県 樹種ポリゴン',
		attribution: '神奈川県森林再生課（林野庁加工）',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/rinya-kanagawa-maptiles2',
		location: '神奈川県',
		tags: ['森林', '林相図'],
		minZoom: 8,
		maxZoom: 16,
		sourceLayer: 'tree_species_kanagawa',
		bounds: KANAGAWA_BBOX,
		xyzImageTile: { x: 14521, y: 6467, z: 14 },
		mapImage: `${MAP_IMAGE_BASE_PATH}/kanagawa_tree_species.webp`
	},
	properties: {
		attributeView: {
			popupKeys: [...TREE_SPECIES_POPUP_KEYS],
			titles: [
				{
					conditions: ['解析樹種'],
					template: '{解析樹種}'
				},
				{
					conditions: [],
					template: '神奈川県の樹種ポリゴン'
				}
			]
		},
		fields: [...TREE_SPECIES_FIELDS]
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
					...TREE_SINGLE_COLOR_STYLE
				},
				{
					type: 'match',
					key: '解析樹種',
					name: '樹種ごとの色分け',
					mapping: {
						categories: [
							'スギ',
							'ヒノキ類',
							'マツ類',
							'カラマツ',

							'その他Ｎ', // 針葉樹

							'その他L', // 広葉樹
							'タケ',
							'針広混交林',
							'新植地',
							'伐採跡地',
							'その他'
						],
						values: [
							'#33a02c',
							'#b2df8a',
							'#a6cee3',
							'#1f78b4',
							'#fdbf6f',
							'#ff7f00',
							'#b15928',
							'#33a02c', // 針広混交林
							'#b2df8a', // 新植地
							'#a6cee3', // 伐採跡地
							'#1f78b4' // その他（グレー）
						],
						// パターン情報
						patterns: [
							null,
							null,
							null,
							null,
							null,
							null,
							null,
							'tmpoly-line-vertical-down-light-200-black',
							'tmpoly-line-vertical-down-light-200-black',
							'tmpoly-line-vertical-down-light-200-black',
							'tmpoly-line-vertical-down-light-200-black'
						]
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
						scheme: 'RdPu',
						range: [0, 5914],
						divisions: 6
					}
				}
			]
		},
		outline: {
			...TREE_SPECIES_OUTLINE
		},
		labels: {
			key: '解析樹種',
			show: false,
			expressions: [
				{
					key: '面積_ha',
					name: '面積_ha'
				},
				{
					key: '解析樹種ID',
					name: '解析樹種ID'
				},
				{
					key: '解析樹種',
					name: '解析樹種'
				},
				{
					key: '森林計測年',
					name: '森林計測年'
				},
				{
					key: '森林計測法',
					name: '森林計測法'
				},
				{
					key: '県code',
					name: '県code'
				},
				{
					key: '市町村code',
					name: '市町村code'
				}
			]
		},
		default: {
			...DEFAULT_POLYGON_STYLE
		}
	}
};

export default entry;
