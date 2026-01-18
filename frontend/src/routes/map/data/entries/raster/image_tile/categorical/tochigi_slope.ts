import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import { TOCHIGI_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'tochigi_slope',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tochigi.geospatial.jp/2023/rinya/tile/slopemap/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '栃木県 傾斜区分図',
		attribution: '栃木県森林資源データ',
		location: '栃木県',
		tags: ['傾斜区分図'],
		minZoom: 8,
		maxZoom: 15,
		tileSize: 256,
		bounds: TOCHIGI_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/slopemap_tochigi',
		xyzImageTile: {
			x: 3635,
			y: 1597,
			z: 12
		}
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		legend: {
			type: 'category',
			name: '傾斜',
			colors: ['#0000FE', '#56FE01', '#FFFF00', '#FE0000'],
			labels: ['0度 - 15度', '15度 - 30度', '30度 - 35度', '35度以上']
		}
	}
};

export default entry;
