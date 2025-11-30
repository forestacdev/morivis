import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/style';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'dem_kochi',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.gsj.jp/tiles/elev/kochi/{z}/{y}/{x}.png'
	},
	metaData: {
		name: '高知県 数値標高データ',
		sourceDataName: '高知県「数値標高モデル(DEM)0.5m」',
		downloadUrl: 'https://tiles.gsj.jp/tiles/elev/tiles.html#kochi',
		attribution: '産総研シームレス標高タイル',
		tags: ['DEM', '地形', '0.5m解像度'],
		location: '高知県',
		minZoom: 2,
		maxZoom: 18,
		tileSize: 256,
		bounds: [132.4748986, 32.6983375, 134.3183756, 33.8859144],
		xyzImageTile: { x: 3565, y: 1639, z: 12 }
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
					max: 2000,
					min: 0,
					colorMap: 'jet'
				}
			}
		}
	}
};

export default entry;
