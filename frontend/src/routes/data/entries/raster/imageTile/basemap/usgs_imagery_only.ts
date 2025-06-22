import {
	DEFAULT_RASTER_BASEMAP_STYLE,
	DEFAULT_RASTER_BASEMAP_INTERACTION
} from '$routes/data/style';
import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'usgs_imagery_only',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}?blankTile=false'
	},
	metaData: {
		name: 'USGS Imagery Only',
		description: '',
		attribution: 'USGS',
		downloadUrl: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer',
		location: '世界',
		minZoom: 1,
		maxZoom: 22,
		tileSize: 256,
		xyzImageTile: {
			x: 1,
			y: 1,
			z: 1
		}
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
