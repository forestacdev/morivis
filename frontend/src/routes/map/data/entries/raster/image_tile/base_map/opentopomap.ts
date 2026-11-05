import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { WEB_MERCATOR_WORLD_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'opentopomap',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png'
	},
	metaData: {
		name: 'OpenTopoMap',
		sourceDataName: 'OpenTopoMap / OpenStreetMap / SRTM / Sonny',
		description:
			'OpenStreetMapと標高データを基に、等高線や陰影、地名・道路を描いた地形図。地形の起伏や等高線の標高を読む際の背景地図として利用できる。',
		attribution: 'OpenTopoMap',
		location: '世界',
		tags: ['背景地図', '地形'],
		// 公式サイトのメインタイル設定に合わせる。z17を超える拡大はoverzoomする。
		minZoom: 1,
		maxZoom: 17,
		tileSize: 256,
		bounds: WEB_MERCATOR_WORLD_BBOX,
		downloadUrl: 'https://opentopomap.org/about',
		xyzImageTile: IMAGE_TILE_XYZ_SETS['zoom_15']
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
