import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/map/data/style';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gifu_pref',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://mapdata.qchizu.xyz/gifu_pref_00/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '岐阜県共有空間データ',
		description: '',
		attribution: 'Q地図タイル',
		location: '岐阜県',
		tags: ['基本図'],
		minZoom: 5,
		maxZoom: 18,
		tileSize: 256,
		bounds: [136.276225, 35.133729, 137.651936, 36.465031]
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
