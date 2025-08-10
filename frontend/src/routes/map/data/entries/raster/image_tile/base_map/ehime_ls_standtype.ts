import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/map/data/style';
import { EHIME_BBOX } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'ehime_ls_standtype',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-ehime.geospatial.jp/tile/rinya/2024/ls_standtype_Ehime/{z}/{x}/{-y}.png'
	},
	metaData: {
		name: '愛媛県 レーザ林相図',
		attribution: '愛媛県森林資源データ',
		location: '愛媛県',
		tags: ['森林', '林相図', 'レーザ林相図'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: EHIME_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/ls_standtype_ehime',
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
