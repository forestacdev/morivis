import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/style';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'dem_yamanashi',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://forestgeo.info/opendata/19_yamanashi/dem_terrainRGB_2024/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '山梨県 DEM',
		description: '',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/rinya-yamanashi-maptiles',
		attribution: '林野庁',
		location: '山梨県',
		tags: ['DEM', '地形'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: [139.539712, 37.73383, 140.646377, 39.208476]
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
