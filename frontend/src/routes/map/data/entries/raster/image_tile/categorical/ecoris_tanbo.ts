import type {
	RasterImageEntry,
	RasterBaseMapStyle,
	RasterCategoricalStyle
} from '$routes/map/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/map/data/style';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'ecoris_tanbo',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://map.ecoris.info/tiles/tanbo/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '田んぼ',
		description:
			'第5回 自然環境保全基礎調査 植生調査結果GISデータ(環境省生物多様性センター)から水田雑草群落を抽出し、株式会社エコリスが着色し加工したものです。',
		attribution: 'エコリス地図タイル',
		location: '全国',
		minZoom: 5,
		maxZoom: 15,
		tileSize: 256,
		tags: ['田んぼ'],
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
		type: 'categorical',
		opacity: 0.8,
		legend: {
			type: 'category',
			name: '',
			colors: ['#02FF02'],
			labels: ['水田雑草群落']
		}
	}
};

export default entry;
