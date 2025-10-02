import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/map/data/style';
import { KANAGAWA_BBOX } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'kanagawa_rrim',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://forestgeo.info/opendata/14_kanagawa/rrim_2022/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '神奈川県 赤色立体地図',
		attribution: '神奈川県森林再生課（林野庁加工）',
		location: '神奈川県',
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		tags: ['地形', '赤色立体地図'],
		bounds: KANAGAWA_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/rinya-kanagawa-maptiles',
		xyzImageTile: { x: 29045, y: 12933, z: 15 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
