import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/map/data/style';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'biodic_vg67',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://gis.biodic.go.jp/webgis/files/vg67/tile/vg67/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '植生図',
		description: '植生図',
		attribution: '環境省生物多様性センター',
		location: '全国',
		minZoom: 1,
		maxZoom: 22,
		tileSize: 256,
		tags: ['植生図'],
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
