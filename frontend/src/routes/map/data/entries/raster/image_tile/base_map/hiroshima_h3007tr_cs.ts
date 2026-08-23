import { HIROSHIMA_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'hiroshima_h3007tr_cs',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tiles.geospatial.jp/csmap_h3007tr_2025/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '平成30年7月豪雨 CS立体図',
		sourceDataName: 'CS立体図ラスタタイルXYZ',
		description:
			'平成30年7月豪雨の対象地域をCS立体図で表現したラスタタイル。尾根や谷などの地形判読に利用できる。',
		attribution: '林野庁',
		location: '広島県',
		tags: ['地形', '微地形図', 'ハザード'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: HIROSHIMA_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/h30_7_gouu',
		xyzImageTile: { x: 14250, y: 6513, z: 14 }
	},
	interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
	style: { ...DEFAULT_RASTER_BASEMAP_STYLE }
};

export default entry;
