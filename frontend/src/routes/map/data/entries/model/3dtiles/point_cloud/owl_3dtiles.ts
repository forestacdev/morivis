import { COVER_IMAGE_BASE_PATH, ENTRY_3DTILES_PATH, MAP_IMAGE_BASE_PATH } from '$routes/constants';
import type { ModelTiles3DEntry, PointCloudStyle } from '$routes/map/data/types/model';

const entry: ModelTiles3DEntry<PointCloudStyle> = {
	id: 'ensyurin_owl_3dtiles',
	type: 'model',
	format: {
		type: '3d-tiles',
		url: `${ENTRY_3DTILES_PATH}/ensyurin_owl`
	},
	metaData: {
		name: '演習林 単木 点群',
		description: '2021年度に実施した林業専攻のOWL利用研修立木計測データ。',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		minZoom: 10,
		maxZoom: 22,
		tags: ['森林', '単木'],
		bounds: [136.920923, 35.548695, 136.921198, 35.548997],
		xyzImageTile: { x: 923099, y: 413380, z: 20 },
		coverImage: `${COVER_IMAGE_BASE_PATH}/ensyurin_owl.webp`,
		mapImage: `${MAP_IMAGE_BASE_PATH}/ensyurin_owl.webp`
	},
	interaction: {
		clickable: false
	},
	style: {
		type: 'point-cloud',
		opacity: 0.7,
		pointSize: 0.1
	}
};

export default entry;
