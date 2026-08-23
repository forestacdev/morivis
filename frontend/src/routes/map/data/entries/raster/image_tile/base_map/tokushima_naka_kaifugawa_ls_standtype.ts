import { TOKUSHIMA_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'tokushima_naka_kaifugawa_ls_standtype',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tiles.geospatial.jp/ls_standtype_117_2025/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '那賀・海部川森林計画区 林相識別図',
		sourceDataName: '林相識別図ラスタタイルXYZ',
		description:
			'徳島県の林相識別図をラスタタイル化したデータ。森林の林相分布を地図上で確認する際に利用できる。',
		attribution: '徳島県_林野庁加工',
		location: '徳島県',
		tags: ['森林', '林相図'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: TOKUSHIMA_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/tokushima_aerial_laser',
		xyzImageTile: { x: 28604, y: 13114, z: 15 }
	},
	interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
	style: { ...DEFAULT_RASTER_BASEMAP_STYLE }
};

export default entry;
