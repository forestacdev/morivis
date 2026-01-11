import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import type {} from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import { KOCHI_BBOX } from '$routes/map/data/entries/meta_data/_bounds';
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
			name: '傾斜量',
			colors: ['#0200FC', '#32C2FF', '#B7FE8E', '#FFC801', '#FE0000'],
			labels: [
				'0度以上15度未満',
				'15度以上30度未満',
				'30度以上40度未満',
				'40度以上45度未満',
				'45度以上'
			]
		}
	}
};

export default entry;
