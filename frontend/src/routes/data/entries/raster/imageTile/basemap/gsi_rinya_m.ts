import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/data/style';
import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gsi_rinya_m',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/rinya_m/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '森林（民有林）の空中写真',
		description: '',
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#trinya',
		attribution: '国土地理院',
		location: '全国',
		minZoom: 14,
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
