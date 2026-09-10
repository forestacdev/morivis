import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterDemStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import { WEB_MERCATOR_WORLD_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'mapterhorn',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '全世界標高データ',
		sourceDataName: 'mapterhorn',
		downloadUrl: 'https://github.com/mapterhorn/mapterhorn',
		attribution: 'mapterhorn',
		tags: ['DEM', '地形'],
		location: '世界',
		minZoom: 0,
		maxZoom: 16,
		tileSize: 512,
		bounds: WEB_MERCATOR_WORLD_BBOX,
		xyzImageTile: { x: 3, y: 1, z: 2 }
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
					type: 'linear',
					max: 6000,
					min: 0,
					colorMap: 'jet'
				}
			}
		}
	}
};

export default entry;
