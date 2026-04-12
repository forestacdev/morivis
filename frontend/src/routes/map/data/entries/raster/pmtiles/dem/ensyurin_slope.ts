import type { RasterPMTilesEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/entries/raster/_style';
import { ENTRY_PMTILES_RASTER_PATH, IMAGE_TILE_XYZ_SETS } from '$routes/constants';

const entry: RasterPMTilesEntry<RasterDemStyle> = {
	id: 'ensyurin_slope',
	type: 'raster',
	format: {
		type: 'pmtiles',
		url: `${ENTRY_PMTILES_RASTER_PATH}/ensyurin_slope.pmtiles`
	},
	metaData: {
		name: '演習林 数値傾斜データ',
		description: '森林文化アカデミー演習林の地形の傾斜を数値化したもの',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		tags: ['傾斜量図', '地形'],
		minZoom: 14,
		maxZoom: 17,
		tileSize: 512,
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_16, // 画像タイルのXYZ座標
		bounds: [136.91683974376355, 35.540611389073774, 136.9346116207808, 35.55838201305548]
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_DEM_STYLE,
		visualization: {
			...DEFAULT_RASTER_DEM_STYLE.visualization,
			demType: 'terrarium',
			mode: 'relief',
			uniformsData: {
				relief: {
					...DEFAULT_RASTER_DEM_STYLE.visualization.uniformsData.relief,
					max: 90,
					min: 0,
					colorMap: 'hot'
				}
			}
		}
	}
};

export default entry;
