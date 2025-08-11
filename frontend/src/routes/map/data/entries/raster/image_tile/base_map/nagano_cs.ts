import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/map/data/style';
import { NAGANO_BBOX } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'nagano_cs',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tile.geospatial.jp/CS/VER2/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '長野県 CS立体図',
		attribution: '長野県林業総合センター',
		location: '長野県',
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		tags: ['微地形図', '地形'],
		bounds: NAGANO_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/nagano-csmap',
		xyzImageTile: { x: 28950, y: 12852, z: 15 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
