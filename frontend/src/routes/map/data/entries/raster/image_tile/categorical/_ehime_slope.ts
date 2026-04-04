import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import type {} from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import { EHIME_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'ehime_slope',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-ehime.geospatial.jp/tile/rinya/2024/slope_Ehime/{z}/{x}/{-y}.png'
	},
	metaData: {
		name: '愛媛県 傾斜区分図',
		attribution: '愛媛県林業政策課_林野庁加工',
		location: '愛媛県',
		tags: ['傾斜区分図'],
		minZoom: 8,
		maxZoom: 15,
		tileSize: 256,
		bounds: EHIME_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/slopemap_ehime',
		xyzImageTile: {
			x: 227730,
			y: 105126,
			z: 18
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
			colors: ['#0F02FE', '#00B050', '#99FF99', '#FEFF00', '#FFC100'],
			labels: ['0以上15度未満', '15以上20度未満', '20以上30度未満', '30以上35度未満', '35以上']
		}
	}
};

export default entry;
