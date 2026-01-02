import { COVER_IMAGE_BASE_PATH, ENTRY_3DTILES_PATH, MAP_IMAGE_BASE_PATH } from '$routes/constants';
import type { ModelTiles3DEntry, PointCloudStyle } from '$routes/map/data/types/model';

const entry: ModelTiles3DEntry<PointCloudStyle> = {
	id: 'ensyurin_owl_3dtiles',
	type: 'model',
	format: {
		type: '3d-tiles',
		url: `${ENTRY_3DTILES_PATH}/ensyurin_owl/tileset.json`
	},
	metaData: {
		name: '演習林 単木 点群',
		description: '2021年度に実施した林業専攻のOWL利用研修立木計測データ。',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		minZoom: 10,
		maxZoom: 22,
		tags: ['森林', '単木'],
		bounds: [136.92055416544, 35.54856972088334, 136.9217569739988, 35.54913869414441],
		center: [136.92102808, 35.54882817],
		altitude: 201,
		xyzImageTile: { x: 923099, y: 413380, z: 20 },
		mapImage: `${COVER_IMAGE_BASE_PATH}/ensyurin_owl_poc.webp`,
		coverImage: `${COVER_IMAGE_BASE_PATH}/ensyurin_owl_poc.webp`
	},
	interaction: {
		clickable: false
	},
	style: {
		type: 'point-cloud',
		opacity: 0.7,
		pointSize: 1
	}
};

export default entry;
