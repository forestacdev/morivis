import { MIE_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'mie_kitaise_cs',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tiles.geospatial.jp/csmap_081_2025/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '北伊勢森林計画区 CS立体図',
		sourceDataName: 'CS立体図ラスタタイル',
		description:
			'北伊勢森林計画区の地形をCS立体図で表現したラスタタイル。尾根や谷などの地形判読に利用できる。',
		attribution: '三重県_林野庁加工',
		location: '三重県',
		tags: ['地形', '微地形図'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: MIE_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/kitaise_081',
		xyzImageTile: { x: 28801, y: 12987, z: 15 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
