import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { EHIME_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'ehime_rrimap',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-ehime.geospatial.jp/tile/rinya/2024/rrimap_Ehime/{z}/{x}/{-y}.png'
	},
	metaData: {
		name: '愛媛県 赤色立体地図',
		attribution: '愛媛県林業政策課_林野庁加工',
		location: '愛媛県',
		tags: ['森林', '赤色立体地図'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: EHIME_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/rrimap_ehime',
		xyzImageTile: {
			x: 227730,
			y: 105126,
			z: 18
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
