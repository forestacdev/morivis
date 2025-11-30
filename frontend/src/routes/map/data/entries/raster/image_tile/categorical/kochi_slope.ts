import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import type {} from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/style';
import { KOCHI_BBOX } from '$routes/map/data/location_bbox';
const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'kochi_slope',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-kochi.geospatial.jp/2023/rinya/tile/slopemap/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '高知県 傾斜区分図',
		attribution: '高知県森林資源データ',
		location: '高知県',
		tags: ['傾斜区分図'],
		minZoom: 8,
		maxZoom: 15,
		tileSize: 256,
		bounds: KOCHI_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/slopemap_kochi',
		xyzImageTile: { x: 14246, y: 6577, z: 14 }
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		legend: {
			type: 'category',
			name: '傾斜',
			colors: ['#0200FC', '#32C2FF', '#B7FE8E', '#FFC801', '#FE0000'],
			labels: ['0 - 14.9度', '15 - 29.9度', '30 - 39.9度', '40 - 44.9度', '45度以上']
		}
	}
};

export default entry;
