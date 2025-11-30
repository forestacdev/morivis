import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/style';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'dem_gsi_geoid',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.gsj.jp/tiles/elev/gsigeoid/{z}/{y}/{x}.png'
	},
	metaData: {
		name: 'ジオイド高データ',
		sourceDataName: 'ジオイド・モデル「日本のジオイド2011」',
		downloadUrl: 'https://tiles.gsj.jp/tiles/elev/tiles.html#gsigeoid',
		attribution: '産総研シームレス標高タイル',
		tags: ['DEM', '地形', 'ジオイド高'],
		location: '全国',
		minZoom: 0,
		maxZoom: 8,
		tileSize: 256,
		bounds: [120, 20, 150, 50],
		xyzImageTile: { x: 28, y: 12, z: 5 } // 画像タイルのXYZ座標
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
