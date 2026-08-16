import { NAGANO_INATANI_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'nagano_inatani_cs',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tiles.geospatial.jp/csmap_067_2025/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '伊那谷森林計画区 CS立体図',
		sourceDataName: 'CS立体図ラスタタイルXYZ',
		description:
			'伊那谷森林計画区の地形をCS立体図で表現したラスタタイル。尾根や谷などの地形判読に利用できる。',
		attribution: '長野県_林野庁加工',
		location: '長野県',
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		tags: ['微地形図', '地形'],
		bounds: NAGANO_INATANI_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/inatani_067',
		xyzImageTile: { x: 28938, y: 12892, z: 15 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
