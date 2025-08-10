import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/map/data/style';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gsi_seamlessphoto',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'
	},
	metaData: {
		name: '全国航空写真',
		sourceDataName: '全国最新写真',
		description: '',
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#seamlessphoto',
		attribution: '国土地理院',
		location: '全国',
		tags: ['写真'],
		minZoom: 1, // 1
		maxZoom: 18,
		tileSize: 256,
		xyzImageTile: IMAGE_TILE_XYZ_SETS['zoom_15'],
		bounds: WEB_MERCATOR_JAPAN_BOUNDS
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
