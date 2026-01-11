import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gsi_jikizu2020_chijiki_d',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/jikizu2020_chijiki_d/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '磁気図2020.0年値',
		attribution: '国土地理院',
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#jikizu2020',
		location: '全国',
		tags: ['磁気図'],
		minZoom: 4,
		maxZoom: 13,
		tileSize: 256,
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_7
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION,
		overlay: true
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
