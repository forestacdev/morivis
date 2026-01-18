import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/entries/raster/_style';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'dem_hyogo',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.gsj.jp/tiles/elev/hyogodem/{z}/{y}/{x}.png'
	},
	metaData: {
		name: '兵庫県 数値標高データ',
		downloadUrl: 'https://tiles.gsj.jp/tiles/elev/tiles.html#h_hyogo',
		attribution: '産総研シームレス標高タイル',
		tags: ['DEM', '地形', '0.5m解像度'],
		location: '兵庫県',
		minZoom: 2,
		maxZoom: 18,
		tileSize: 256,
		bounds: [134.24587, 34.14648, 135.47185, 35.67539],
		xyzImageTile: { x: 3578, y: 1619, z: 12 }
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
					max: 1500,
					min: 0,
					colorMap: 'jet'
				}
			}
		}
	}
};

export default entry;
