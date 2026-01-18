import { MAP_IMAGE_BASE_PATH } from '$routes/constants';
import { HYOGO_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { TREE_MATCH_COLOR_STYLE } from '$routes/map/data/entries/vector/_style';
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
	id: 'hyogo_tree_species',
	type: 'vector',
	format: {
		type: 'mvt',
		geometryType: 'Polygon',
		url: 'https://rinya-hyogo.geospatial.jp/2023/rinya/tile/tree_species/{z}/{x}/{y}.pbf'
	},
	metaData: {
		name: '兵庫県 樹種ポリゴン',
		attribution: '兵庫県森林資源データ',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/tree_species_hyogo',
		location: '兵庫県',
		tags: ['森林', '林相図'],
		minZoom: 8,
		maxZoom: 18,
		sourceLayer: 'tree_species_hyogo',
		bounds: HYOGO_BBOX,
		xyzImageTile: { x: 14326, y: 6487, z: 14 },
		center: [134.848807, 35.043807],
		mapImage: `${MAP_IMAGE_BASE_PATH}/hyogo_tree_species.webp`
	},
	properties: {
		fields: [
			...TREE_SPECIES_FIELDS,
			{ key: 'ID', type: 'number' },
			{ key: '樹冠高90', type: 'number', unit: 'm' },
			{ key: '最大樹冠高', type: 'number', unit: 'm' },
			{ key: '平均傾斜', type: 'number', unit: '度' },
			{ key: '最大傾斜', type: 'number', unit: '度' },
			{ key: '旧市町村名', type: 'string' }
		],
		attributeView: {
			popupKeys: [
				...TREE_SPECIES_POPUP_KEYS,
				'ID',
				'樹冠高90',
				'最大樹冠高',
				'平均傾斜',
				'最大傾斜',
				'旧市町村名'
			],
			titles: [
				...TREE_SPECIES_TITLES,
				{
					conditions: [],
					template: '兵庫県の樹種ポリゴン'
				}
			],
			relations: {
				...TREE_SPECIES_RELATIONS
			}
		}
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
					...TREE_MATCH_COLOR_STYLE
				},
				{
					type: 'step',
					key: '面積_ha',
					name: '面積ごとの色分け',
					mapping: {
						scheme: 'RdPu',
						range: [0, 200],
						divisions: 5
					}
				}
			]
		},
		outline: {
			...TREE_SPECIES_OUTLINE
		},
		labels: {
			...TREE_SPECIES_LABELS,
			expressions: [
				...TREE_SPECIES_LABELS.expressions,
				{
					key: 'ID',
					name: 'ID'
				},
				{
					key: '樹冠高90',
					name: '樹冠高90'
				},
				{
					key: '最大樹冠高',
					name: '最大樹冠高'
				},
				{
					key: '平均傾斜',
					name: '平均傾斜'
				},
				{
					key: '最大傾斜',
					name: '最大傾斜'
				},
				{
					key: '旧市町村名',
					name: '旧市町村名'
				}
			]
		},
		default: {
			...DEFAULT_POLYGON_STYLE
		}
	}
};

export default entry;
