import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/map/data/style';
import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gsi_rinya_m',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/rinya_m/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '民有林の空中写真',
		description: `都道府県が2013年以降に整備した森林（民有林）の空中写真をウェブ上で閲覧できるように加工したものです。（引用：地理院タイル）`,
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#trinya',
		attribution: '国土地理院',
		tags: ['森林', '写真'],
		location: '全国',
		minZoom: 14,
		maxZoom: 18,
		tileSize: 256,
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
