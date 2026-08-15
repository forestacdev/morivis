import { TOTTORI_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'tottori_cs',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tottori.geospatial.jp/tile/rinya/2024/csmap_tottori/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '鳥取県 CS立体図',
		attribution: '鳥取県林政企画課',
		location: '鳥取県',
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		tags: ['地形', '微地形図'],
		bounds: TOTTORI_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/csmap_tottori',
		xyzImageTile: { x: 14282, y: 6470, z: 14 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
