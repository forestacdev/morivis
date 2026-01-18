import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { WEB_MERCATOR_WORLD_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'usgs_imagery_only',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}'
	},
	metaData: {
		name: 'USGS Imagery Only',

		attribution: 'USGS',
		tags: ['写真'],
		downloadUrl: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer',
		location: '世界',
		minZoom: 1,
		maxZoom: 22,
		tileSize: 256,
		bounds: WEB_MERCATOR_WORLD_BBOX,
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
