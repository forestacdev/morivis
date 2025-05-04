import {
	DEFAULT_RASTER_BASEMAP_STYLE,
	DEFAULT_RASTER_BASEMAP_INTERACTION
} from '$routes/data/style';
import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gsi_std',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '地理院標準地図',
		description: '国土地理院の電子国土基本図',
		attribution: '国土地理院',
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#std',
		location: '全国',
		minZoom: 1,
		maxZoom: 18,
		tileSize: 256
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
