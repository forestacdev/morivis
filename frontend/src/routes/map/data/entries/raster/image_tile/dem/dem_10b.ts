import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/style';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'dem_10b',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '基盤地図情報数値標高モデル DEM10B',
		description: '',
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#dem',
		attribution: '国土地理院',
		tags: ['DEM', '地形'],
		location: '全国',
		minZoom: 1,
		maxZoom: 14,
		tileSize: 256,
		bounds: [122.935, 20.425, 153.986, 45.551],
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_7
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
