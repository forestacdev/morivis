import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';
import {
	DEFAULT_RASTER_BASEMAP_STYLE,
	DEFAULT_RASTER_BASEMAP_INTERACTION
} from '$routes/map/data/style';
import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gsi_pre',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '地理院淡色地図',
		attribution: '国土地理院',
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#pale',
		location: '全国',
		tags: ['基本図', '背景地図'],
		minZoom: 1,
		maxZoom: 18,
		tileSize: 256,
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
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
