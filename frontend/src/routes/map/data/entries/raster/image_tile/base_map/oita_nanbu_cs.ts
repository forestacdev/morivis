import { OITA_NANBU_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'oita_nanbu_cs',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tiles.geospatial.jp/csmap_143_2025/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '大分南部森林計画区 CS立体図',
		sourceDataName: 'CS立体図ラスタタイルXYZ',
		description:
			'大分県の地形をCS立体図で表現したラスタタイル。尾根や谷などの地形判読に利用できる。',
		attribution: '林野庁',
		location: '大分県',
		tags: ['地形', '微地形図'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: OITA_NANBU_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/oita_aerial_laser',
		xyzImageTile: { x: 14184, y: 6605, z: 14 }
	},
	interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
	style: { ...DEFAULT_RASTER_BASEMAP_STYLE }
};

export default entry;
