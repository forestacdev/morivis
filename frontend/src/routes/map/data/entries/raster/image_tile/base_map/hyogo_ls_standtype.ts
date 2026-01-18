import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { HYOGO_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'hyogo_ls_standtype',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-hyogo.geospatial.jp/2025/rinya/tile/ls_standtype/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '兵庫県 レーザ林相図',
		attribution: '兵庫県',
		location: '兵庫県',
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		tags: ['森林', '林相図', 'レーザ林相図'],
		bounds: HYOGO_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/ls_standtype_hyogo',
		xyzImageTile: { x: 114602, y: 51912, z: 17 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
