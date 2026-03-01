import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/entries/raster/_style';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: '512',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '512',
		sourceDataName: '512',
		downloadUrl: 'https://tiles.gsj.jp/tiles/elev/tiles.html#gsigeoid',
		attribution: '産総研シームレス標高タイル',
		tags: ['DEM', '地形', 'ジオイド高'],
		location: '全国',
		minZoom: 0,
		maxZoom: 16,
		tileSize: 512,
		bounds: [120, 20, 150, 50],
		xyzImageTile: { x: 28846, y: 12917, z: 15 } // 画像タイルのXYZ座標
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_DEM_STYLE,
		visualization: {
			...DEFAULT_RASTER_DEM_STYLE.visualization,
			demType: 'terrarium',
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
