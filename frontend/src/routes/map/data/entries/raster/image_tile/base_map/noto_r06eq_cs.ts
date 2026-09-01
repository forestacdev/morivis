import { ISHIKAWA_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'noto_r06eq_cs',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tiles.geospatial.jp/csmap_r06eq_2025/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '令和6年能登半島地震 CS立体図',
		sourceDataName: 'CS立体図ラスタタイルXYZ',
		description:
			'令和6年能登半島地震の対象地域をCS立体図で表現したラスタタイル。尾根や谷などの地形判読に利用できる。',
		attribution: '林野庁',
		location: '石川県',
		tags: ['地形', '微地形図', '地震'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: ISHIKAWA_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/r6_noto-peninsula-earthquake',
		xyzImageTile: { x: 28866, y: 12698, z: 15 }
	},
	interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
	style: { ...DEFAULT_RASTER_BASEMAP_STYLE }
};

export default entry;
