import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import type {} from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/style';
import { HYOGO_BBOX } from '$routes/map/data/location_bbox';
const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'hyogo_slope',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-hyogo.geospatial.jp/2025/rinya/tile/slopemap/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '兵庫県 傾斜区分図',
		attribution: '兵庫県',
		location: '兵庫県',
		tags: ['傾斜区分図'],
		minZoom: 8,
		maxZoom: 15,
		tileSize: 256,
		bounds: HYOGO_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/slopemap_hyogo',
		xyzImageTile: { x: 57325, y: 25961, z: 16 }
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		legend: {
			type: 'category',
			name: '傾斜',
			colors: ['#FFFFD5', '#FED98E', '#FE992A', '#D9600E', '#993405'],
			labels: ['0度 - 10度', '10 - 20度', '20度 - 30度', '30度 - 40度', '40度以上']
		}
	}
};

export default entry;
