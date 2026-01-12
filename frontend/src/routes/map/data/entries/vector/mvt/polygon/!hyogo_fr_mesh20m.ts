import { MAP_IMAGE_BASE_PATH } from '$routes/constants';
import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';
import { FOREST_MESH_PROPERTIES } from '$routes/map/data/entries/vector/_properties';
import { FOREST_MESH_STYLE } from '$routes/map/data/entries/vector/_style';

const entry: VectorEntry<TileMetaData> = {
	id: 'hyogo_fr_mesh20m',
	type: 'vector',
	format: {
		type: 'mvt',
		geometryType: 'Polygon',
		url: 'https://rinya-hyogo.geospatial.jp/2023/rinya/tile/fr_mesh20m/{z}/{x}/{y}.pbf'
	},
	metaData: {
		name: '兵庫県 森林資源量集計メッシュ',
		attribution: '兵庫県',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/fr_mesh20m_hyogo',
		location: '兵庫県',
		tags: ['森林', 'メッシュ'],
		minZoom: 13,
		maxZoom: 16,
		sourceLayer: 'fr_mesh20m_hyogo',
		bounds: [134.252809, 34.156129, 135.468591, 35.674667],
		xyzImageTile: { x: 57274, y: 25978, z: 16 },
		center: [134.651168, 34.897842],
		mapImage: `${MAP_IMAGE_BASE_PATH}/hyogo_fr_mesh20m.webp`
	},
	properties: {
		fields: {
			...FOREST_MESH_PROPERTIES.fields
		},
		attributeView: {
			popupKeys: [
				...FOREST_MESH_PROPERTIES.attributeView.popupKeys,
				'ID',
				'樹冠高90',
				'最大樹冠高'
			],
			relations: {
				...FOREST_MESH_PROPERTIES.attributeView.relations
			},
			titles: [
				...FOREST_MESH_PROPERTIES.attributeView.titles,
				{
					conditions: [],
					template: '兵庫県の森林資源メッシュ'
				}
			]
		}
	},
	interaction: {
		clickable: true
	},
	style: {
		...FOREST_MESH_STYLE,
		colors: {
			...FOREST_MESH_STYLE.colors
		},
		outline: {
			...FOREST_MESH_STYLE.outline
		},
		labels: {
			...FOREST_MESH_STYLE.labels,
			expressions: [...FOREST_MESH_STYLE.labels.expressions]
		},
		default: {
			...FOREST_MESH_STYLE.default
		}
	}
};

export default entry;
