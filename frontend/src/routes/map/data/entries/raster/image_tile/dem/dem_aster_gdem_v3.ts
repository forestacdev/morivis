import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/style';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';

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
		attribution: '国土地理院',
		tags: ['DEM', '地形', '10m解像度'],
		location: '全国',
		minZoom: 1,
		maxZoom: 12,
		tileSize: 256,
		bounds: WEB_MERCATOR_WORLD_BBOX,
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_9
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
