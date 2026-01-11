import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/entries/raster/style';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'dem_1a',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://mapdata.qchizu.xyz/03_dem/52_gsi/all_2025/1_02/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '全国数値標高データ 1mメッシュ',
		sourceDataName: '基盤地図情報1mメッシュDEM',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/qchizu_94dem_99gsi',
		attribution: 'Q地図タイル',
		tags: ['DEM', '地形', '1m解像度'],
		location: '全国',
		minZoom: 1,
		maxZoom: 17,
		tileSize: 256,
		bounds: [122.935, 20.425, 153.986, 45.551],
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_9 // 画像タイルのXYZ座標
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_DEM_STYLE,
		visualization: {
			...DEFAULT_RASTER_DEM_STYLE.visualization,
			demType: 'gsi'
		}
	}
};

export default entry;
