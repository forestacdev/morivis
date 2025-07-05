import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/map/data/style';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: '',
	type: 'raster',
	format: {
		type: 'image',
		url: ''
	},
	metaData: {
		name: 'カスタムデータ',
		description: '',
		attribution: 'カスタムデータ',
		location: '不明',
		minZoom: 0,
		maxZoom: 22,
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
