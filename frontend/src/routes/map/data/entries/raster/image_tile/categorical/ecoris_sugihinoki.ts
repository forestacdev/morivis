import type { RasterImageEntry, RasterCategoricalStyle } from '$routes/map/data/types/raster';

import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/meta_data/_bounds';
import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'ecoris_sugihinoki',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://map.ecoris.info/tiles/sugihinoki/{z}/{x}/{y}.png'
	},
	metaData: {
		name: 'スギ・ヒノキ・サワラ植林分布図',
		sourceDataName: 'スギ・ヒノキ・サワラ植林（自然環境保全基礎調査 植生調査結果GISデータ）',
		attribution: 'エコリス地図タイル',
		tags: ['植生図'],
		location: '全国',
		minZoom: 5,
		maxZoom: 15,
		tileSize: 256,
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		downloadUrl: 'https://map.ecoris.info/#contents',
		xyzImageTile: {
			x: 450,
			y: 201,
			z: 9
		}
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		legend: {
			type: 'category',
			name: '',
			colors: ['#FD4202', '#B7FFFF', '#FFFFFF'],
			labels: ['スギ・ヒノキ・サワラ植林地', '水域', 'その他']
		}
	}
};

export default entry;
