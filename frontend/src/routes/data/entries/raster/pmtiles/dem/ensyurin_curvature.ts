import type { RasterPMTilesEntry, RasterDemStyle } from '$routes/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/data/style';
import { ENTRY_PMTILES_RASTER_PATH, IMAGE_TILE_XYZ_SETS } from '$routes/constants';

const entry: RasterPMTilesEntry<RasterDemStyle> = {
	id: 'ensyurin_curvature',
	type: 'raster',
	format: {
		type: 'pmtiles',

		url: `${ENTRY_PMTILES_RASTER_PATH}/ensyurin_curvature.pmtiles`
	},
	metaData: {
		name: '演習林 曲率図',
		description: '森林文化アカデミー演習林の地形の曲率を数値化したもの',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		minZoom: 14,
		maxZoom: 17,
		tileSize: 256,
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
			demType: 'mapbox',
			uniformsData: {
				...DEFAULT_RASTER_DEM_STYLE.visualization.uniformsData,
				evolution: {
					max: 5,
					min: -5,
					colorMap: 'rdbu'
				}
			}
		}
	}
};

export default entry;
