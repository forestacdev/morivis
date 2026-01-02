import { COVER_IMAGE_BASE_PATH, ENTRY_3DTILES_PATH, MAP_IMAGE_BASE_PATH } from '$routes/constants';
import type { ModelTiles3DEntry, PointCloudStyle } from '$routes/map/data/types/model';

const entry: ModelTiles3DEntry<PointCloudStyle> = {
	id: 'yamanasi_01_kyouchu',
	type: 'model',
	format: {
		type: '3d-tiles',
		url: `https://yamanashi-tile.geospatial.jp/tile/2024/01_kyouchu/tileset.json`
	},
	metaData: {
		name: '山梨 峡中 点群',
		description: '',
		attribution: '山梨県',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/yamanashi-pointcloud-2024',
		location: '山梨県',
		minZoom: 10,
		maxZoom: 22,
		tags: ['点群'],
		bounds: [138.04102760509463, 35.561437976377555, 138.8027787524404, 35.919959445438714],
		altitude: 1226.4,
		xyzImageTile: { x: 923099, y: 413380, z: 20 }
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
