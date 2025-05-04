import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/data/style';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'ecoris_vege_6',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://map.ecoris.info/tiles/vege67/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '第6～7回 植生図',
		description:
			'第6～7回 自然環境保全基礎調査 植生調査結果GISデータ(環境省生物多様性センター)を使用し、株式会社エコリスが着色し加工したもの',
		attribution: 'エコリス地図タイル',
		downloadUrl: 'https://map.ecoris.info/#contents',
		location: '全国',
		minZoom: 5,
		maxZoom: 15,
		tileSize: 256,
		xyzImageTile: {
			x: 7211,
			y: 3229,
			z: 13
		}
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
