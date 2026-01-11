import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/entries/raster/_style';
import { TOCHIGI_BBOX } from '$routes/map/data/entries/meta_data/_bounds';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'tochigi_dem',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.gsj.jp/tiles/elev/tochigi/{z}/{y}/{x}.png'
	},
	metaData: {
		name: '栃木県 数値標高データ',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/dem05_tochigi',
		attribution: '栃木県森林資源データ',
		location: '栃木県',
		tags: ['DEM', '地形', '0.5m解像度'],
		minZoom: 2,
		maxZoom: 18,
		tileSize: 256,
		xyzImageTile: {
			x: 3635,
			y: 1597,
			z: 12
		},
		bounds: TOCHIGI_BBOX
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
					max: 2600,
					min: 0,
					colorMap: 'jet'
				}
			}
		}
	}
};

export default entry;
