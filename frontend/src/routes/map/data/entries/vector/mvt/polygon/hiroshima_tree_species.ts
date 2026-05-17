import { MAP_IMAGE_BASE_PATH, ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
import { HIROSHIMA_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import type { PolygonEntry, TileMetaData } from '$routes/map/data/types/vector/index';
import { TREE_SPECIES_PROPERTIES } from '$routes/map/data/entries/vector/_properties';
import {
	DEFAULT_POLYGON_STYLE,
	TREE_SPECIES_LABELS,
	TREE_SPECIES_OUTLINE,
	TREE_SPECIES_STYLE,
	TREE_SINGLE_COLOR_STYLE,
	createMatchColorMapping
} from '$routes/map/data/entries/vector/_style';

const entry: PolygonEntry<TileMetaData> = {
	id: 'hiroshima_tree_species',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Polygon',
		url: `${ENTRY_PMTILES_VECTOR_PATH}/tree_species_hiroshima.pmtiles`
	},
	metaData: {
		name: '広島県 樹種ポリゴン',
		attribution: '広島県林業課_林野庁加工',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/rinya-hiroshima-maptiles',
		location: '広島県',
		tags: ['森林', '林相図', '樹種'],
		minZoom: 8,
		maxZoom: 16,
		sourceLayer: 'tree_species_hiroshima',
		bounds: HIROSHIMA_BBOX,
		xyzImageTile: { x: 28450, y: 13023, z: 15 },
		mapImage: `${MAP_IMAGE_BASE_PATH}/hiroshima_tree_species.webp`
	},
	properties: {
		...TREE_SPECIES_PROPERTIES
	},
	interaction: {
		clickable: true
	},
	style: {
		...TREE_SPECIES_STYLE,
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
					mapping: createMatchColorMapping(
						['スギ', 'ヒノキ類', 'マツ類', 'タケ', 'その他'],
						'treeSpecies'
					) // '
				},
				{
					type: 'step',
					key: '面積_ha',
					name: '面積ごとの色分け',
					mapping: {
						scheme: 'RdPu',
						range: [0, 9380],
						divisions: 5
					}
				}
			]
		},
		outline: {
			...TREE_SPECIES_OUTLINE
		},
		labels: {
			...TREE_SPECIES_LABELS
		},
		default: {
			...DEFAULT_POLYGON_STYLE
		}
	}
};

export default entry;
