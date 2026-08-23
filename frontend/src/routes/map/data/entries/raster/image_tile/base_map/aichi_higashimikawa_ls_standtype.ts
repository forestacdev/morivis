import { AICHI_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'aichi_higashimikawa_ls_standtype',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tiles.geospatial.jp/ls_standtype_079_2025/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '東三河森林計画区 林相識別図',
		sourceDataName: '林相識別図ラスタタイルXYZ',
		description:
			'東三河森林計画区の林相識別図をラスタタイル化したデータ。森林の林相分布を地図上で確認する際に利用できる。',
		attribution: '愛知県_林野庁加工',
		location: '愛知県',
		tags: ['森林', '林相図'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: AICHI_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/higashimikawa_079',
		xyzImageTile: { x: 28858, y: 12926, z: 15 }
	},
	interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
	style: { ...DEFAULT_RASTER_BASEMAP_STYLE }
};

export default entry;
