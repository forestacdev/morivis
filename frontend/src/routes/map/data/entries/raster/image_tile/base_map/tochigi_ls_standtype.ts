import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/map/data/style';
import { TOCHIGI_BBOX, WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'tochigi_ls_standtype',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tochigi.geospatial.jp/2023/rinya/tile/ls_standtype/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '栃木県 レーザ林相図',
		attribution: '栃木県森林資源データ',
		location: '栃木県',
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		tags: ['森林', '林相図', 'レーザ林相図'],
		bounds: TOCHIGI_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/ls_standtype_tochigi',
		xyzImageTile: {
			x: 3635,
			y: 1597,
			z: 12
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
