import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';

import { WEB_MERCATOR_WORLD_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'osm',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
	},
	metaData: {
		name: 'OpenStreetMap',
		attribution: 'OSM',
		location: '世界',
		minZoom: 0,
		maxZoom: 24,
		tileSize: 256,
		tags: ['背景地図'],
		bounds: WEB_MERCATOR_WORLD_BBOX,
		xyzImageTile: { x: 0, y: 0, z: 0 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
