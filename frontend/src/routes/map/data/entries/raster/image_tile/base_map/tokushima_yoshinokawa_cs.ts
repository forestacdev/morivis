import { TOKUSHIMA_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'tokushima_yoshinokawa_cs',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tiles.geospatial.jp/csmap_116_2025/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '吉野川森林計画区 CS立体図',
		sourceDataName: 'CS立体図ラスタタイルXYZ',
		description:
			'吉野川森林計画区の地形をCS立体図で表現したラスタタイル。尾根や谷などの地形判読に利用できる。',
		attribution: '徳島県_林野庁加工',
		location: '徳島県',
		tags: ['地形', '微地形図'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: TOKUSHIMA_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/yoshinokawa_116',
		xyzImageTile: { x: 57219, y: 26188, z: 16 }
	},
	interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
	style: { ...DEFAULT_RASTER_BASEMAP_STYLE }
};

export default entry;
