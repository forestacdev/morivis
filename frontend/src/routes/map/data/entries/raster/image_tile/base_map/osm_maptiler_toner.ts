import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';

import { WEB_MERCATOR_WORLD_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'osm_maptiler_toner',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tile.openstreetmap.jp/styles/maptiler-toner-ja/512/{z}/{x}/{y}.png'
	},
	metaData: {
		name: 'Maptiler Toner',
		sourceDataName: 'Maptiler-Toner-JA',
		attribution: 'OSM',
		downloadUrl: 'https://wiki.openstreetmap.org/wiki/Japan/OSMFJ_Tileserver',
		location: '世界',
		minZoom: 0,
		maxZoom: 24,
		tileSize: 512,
		tags: ['背景地図'],
		bounds: WEB_MERCATOR_WORLD_BBOX,
		xyzImageTile: IMAGE_TILE_XYZ_SETS['zoom_15']
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
