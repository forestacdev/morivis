import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/map/data/style';
import { TOCHIGI_BBOX, WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'tochigi_cs',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tochigi.geospatial.jp/2023/rinya/tile/csmap/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '栃木県 CS立体図',
		attribution: '栃木県森林資源データ',
		location: '栃木県',
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		tags: ['地形', '微地形図'],
		bounds: TOCHIGI_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/csmap_tochigi',
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
