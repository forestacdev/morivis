import type { RasterImageEntry, RasterCategoricalStyle } from '$routes/map/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/map/data/style';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'ecoris_sugihinoki',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://map.ecoris.info/tiles/sugihinoki/{z}/{x}/{y}.png'
	},
	metaData: {
		name: 'スギ・ヒノキ・サワラ植林',
		description:
			'第5回 自然環境保全基礎調査 植生調査結果GISデータ(環境省生物多様性センター)からスギ・ヒノキ・サワラ植林を抽出し、株式会社エコリスが着色し加工したもの',
		attribution: 'エコリス地図タイル',
		downloadUrl: 'https://map.ecoris.info/#contents',
		location: '全国',
		minZoom: 5,
		maxZoom: 15,
		tileSize: 256,
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
		type: 'categorical',
		opacity: 0.6,
		legend: {
			type: 'category',
			name: '植林',
			colors: ['#FD4202'],
			labels: ['スギ・ヒノキ・サワラ']
		}
	}
};

export default entry;
