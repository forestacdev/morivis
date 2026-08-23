import { KUMAMOTO_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'kumamoto_h28eq_cs',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tiles.geospatial.jp/csmap_h28eq_2025/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '平成28年熊本地震 CS立体図',
		sourceDataName: 'CS立体図ラスタタイルXYZ',
		description:
			'平成28年熊本地震の対象地域をCS立体図で表現したラスタタイル。尾根や谷などの地形判読に利用できる。',
		attribution: '林野庁',
		location: '熊本県',
		tags: ['地形', '微地形図', '地震'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: KUMAMOTO_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/h28_kumamoto_earthquake_aerial_laser',
		xyzImageTile: { x: 7077, y: 3305, z: 13 }
	},
	interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
	style: { ...DEFAULT_RASTER_BASEMAP_STYLE }
};

export default entry;
