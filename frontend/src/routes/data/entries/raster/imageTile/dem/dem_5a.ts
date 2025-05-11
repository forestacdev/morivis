import type { RasterImageEntry, RasterDemStyle } from '$routes/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/data/style';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'dem_5a',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '基盤地図情報数値標高モデル DEM5A',
		description: '',
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#dem',
		attribution: '国土地理院',
		location: '全国',
		minZoom: 1,
		maxZoom: 15,
		tileSize: 256,
		bounds: [122.935, 20.425, 153.986, 45.551]
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
