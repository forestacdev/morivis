import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { HYOGO_BBOX } from '$routes/map/data/entries/meta_data/_bounds';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'hyogo_cs',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-hyogo.geospatial.jp/2023/rinya/tile/csmap/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '兵庫県 CS立体図',
		attribution: '兵庫県',
		location: '兵庫県',
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		tags: ['地形', '微地形図'],
		bounds: HYOGO_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/csmap_hyogo',
		xyzImageTile: { x: 14326, y: 6487, z: 14 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
