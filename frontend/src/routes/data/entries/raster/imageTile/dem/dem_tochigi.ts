import type { RasterImageEntry, RasterDemStyle } from '$routes/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/data/style';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'tochigi_dem',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tochigi.geospatial.jp/2023/rinya/tile/terrainRGB/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '栃木県 数値標高モデル(DEM)0.5m',
		description: '',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/dem05_tochigi',
		attribution: '栃木県森林資源データ',
		location: '栃木県',
		minZoom: 2,
		maxZoom: 18,
		tileSize: 256,
		xyzImageTile: {
			x: 3635,
			y: 1597,
			z: 12
		},
		bounds: [139.326731, 36.199924, 140.291983, 37.155039]
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_DEM_STYLE,
		visualization: {
			...DEFAULT_RASTER_DEM_STYLE.visualization,
			demType: 'mapbox'
		}
	}
};

export default entry;
