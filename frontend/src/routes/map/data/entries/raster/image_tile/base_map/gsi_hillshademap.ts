import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gsi_hillshademap',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '全国陰影起伏図',
		sourceDataName: '陰影起伏図',
		description:
			'地表面の凹凸を陰影で白黒表示した地図。尾根線や谷線の把握、断層などの地形判読に利用できる。',
		attribution: '国土地理院',
		downloadUrl: 'https://www.gsi.go.jp/bousaichiri/hillshademap.html',
		location: '全国',
		minZoom: 2,
		maxZoom: 16,
		tileSize: 256,
		tags: ['地形', '背景地図'],
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_9
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
