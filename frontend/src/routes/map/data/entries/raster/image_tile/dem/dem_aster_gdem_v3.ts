import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/entries/raster/_style';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { WEB_MERCATOR_WORLD_BBOX } from '$routes/map/data/entries/meta_data/_bounds';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'dem_aster_gdem_v3',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.gsj.jp/tiles/elev/astergdemv3/{z}/{y}/{x}.png'
	},
	metaData: {
		name: 'ASTER全球3次元地形データ',
		sourceDataName: 'ASTER GDEM 003',
		downloadUrl: 'https://tiles.gsj.jp/tiles/elev/tiles.html#h_astergdemv3',
		attribution: '産総研シームレス標高タイル',
		tags: ['DEM', '地形'],
		location: '世界',
		minZoom: 0,
		maxZoom: 12,
		tileSize: 256,
		bounds: WEB_MERCATOR_WORLD_BBOX,
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_0
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_DEM_STYLE,
		visualization: {
			...DEFAULT_RASTER_DEM_STYLE.visualization,
			demType: 'gsi',
			uniformsData: {
				...DEFAULT_RASTER_DEM_STYLE.visualization.uniformsData,
				relief: {
					max: 6000,
					min: 0,
					colorMap: 'jet'
				}
			}
		}
	}
};

export default entry;
