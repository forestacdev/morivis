import type { Tiles3DMeshStyle, Tiles3DEntry } from '$routes/map/data/types/model';
import { COVER_IMAGE_BASE_PATH, ENTRY_3DTILES_PATH } from '$routes/constants';

const entry: Tiles3DEntry<Tiles3DMeshStyle> = {
	id: 'gifu-shi_city_2025_citygml_1_op_bldg_3dtiles_lod3',
	type: 'model',
	format: {
		type: '3d-tiles',
		url: `${ENTRY_3DTILES_PATH}/gifu-shi_city_2025_citygml_1_op_bldg_3dtiles_lod3/tileset.json`
	},
	metaData: {
		name: '岐阜市 3D都市モデル',
		sourceDataName: '3D都市モデル（Project PLATEAU）岐阜市（2025年度）',
		description: '',
		attribution: 'PLATEAU',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/plateau-21201-gifu-shi-2025',
		location: '岐阜県',
		minZoom: 10,
		maxZoom: 22,
		tags: ['建物'],
		bounds: [136.722, 35.391, 137.012, 35.561],
		xyzImageTile: { x: 923099, y: 413380, z: 20 }
	},
	interaction: {
		clickable: false
	},
	style: {
		type: '3d-tiles-mesh',
		opacity: 0.7,
		color: '#ffffff',
		lighting: 'flat'
	}
};

export default entry;
