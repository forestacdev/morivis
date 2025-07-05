import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/style';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'tochigi_dem',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.gsj.jp/tiles/elev/tochigi/{z}/{y}/{x}.png'
	},
	metaData: {
		name: '栃木県 数値標高モデル(DEM)0.5m',
		description: '',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/dem05_tochigi',
		attribution: '産総研シームレス標高タイル',
		location: '栃木県',
		tags: ['DEM', '地形'],
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
			demType: 'gsi'
		}
	}
};

export default entry;
