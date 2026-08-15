import { MIE_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'mie_kitaise_ls_standtype',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tiles.geospatial.jp/ls_standtype_081_2025/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '北伊勢森林計画区 林相識別図',
		sourceDataName: '林相識別図ラスタタイル',
		description:
			'北伊勢森林計画区の林相識別図をラスタタイル化したデータ。森林の林相分布を地図上で確認する際に利用できる。',
		attribution: '三重県_林野庁加工',
		location: '三重県',
		tags: ['森林', '林相図'],
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
