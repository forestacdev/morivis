import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/map/data/style';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'ecoris_vege_5',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://map.ecoris.info/tiles/vege/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '第5回 植生図',
		description:
			'第5回 自然環境保全基礎調査 植生調査結果GISデータ(環境省生物多様性センター)を使用し、株式会社エコリスが着色し加工したもの',
		attribution: 'エコリス地図タイル',
		downloadUrl: 'https://map.ecoris.info/#contents',
		location: '全国',
		minZoom: 5,
		maxZoom: 15,
		tileSize: 256,
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
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
