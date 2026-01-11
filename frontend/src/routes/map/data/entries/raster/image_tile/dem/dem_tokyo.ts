import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/entries/raster/style';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'dem_tokyo',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.gsj.jp/tiles/elev/tokyo/{z}/{y}/{x}.png'
	},
	metaData: {
		name: '東京都 数値標高データ',
		downloadUrl: 'https://tiles.gsj.jp/tiles/elev/tiles.html#h_tokyo',
		attribution: '産総研シームレス標高タイル',
		tags: ['DEM', '地形', '0.25m解像度'],
		location: '東京都',
		minZoom: 2,
		maxZoom: 19,
		tileSize: 256,
		bounds: [138.942922, 32.440258, 139.861054, 35.898368],
		xyzImageTile: {
			x: 3631,
			y: 1612,
			z: 12
		}
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
