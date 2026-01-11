import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { KOCHI_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'kochi_ls_standtype',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-kochi.geospatial.jp/2023/rinya/tile/ls_standtype/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '高知県 レーザ林相図',
		attribution: '高知県森林資源データ',
		location: '高知県',
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		tags: ['森林', '林相図', 'レーザ林相図'],
		bounds: KOCHI_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/ls_standtype_kochi',
		xyzImageTile: { x: 114042, y: 52504, z: 17 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
