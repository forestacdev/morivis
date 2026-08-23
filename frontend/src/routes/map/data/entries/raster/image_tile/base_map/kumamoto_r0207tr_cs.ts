import { KUMAMOTO_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'kumamoto_r0207tr_cs',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tiles.geospatial.jp/csmap_r0207tr_2025/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '令和2年7月豪雨 CS立体図',
		sourceDataName: 'CS立体図ラスタタイルXYZ',
		description:
			'令和2年7月豪雨の対象地域をCS立体図で表現したラスタタイル。尾根や谷などの地形判読に利用できる。',
		attribution: '林野庁',
		location: '熊本県',
		tags: ['地形', '微地形図', 'ハザード'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: KUMAMOTO_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/r2_7_gouu',
		xyzImageTile: { x: 28210, y: 13085, z: 15 }
	},
	interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
	style: { ...DEFAULT_RASTER_BASEMAP_STYLE }
};

export default entry;
