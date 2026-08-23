import { OITA_NANBU_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'oita_nanbu_ls_standtype',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://rinya-tiles.geospatial.jp/ls_standtype_143_2025/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '大分南部森林計画区 林相識別図',
		sourceDataName: '林相識別図ラスタタイルXYZ',
		description:
			'大分県の林相識別図をラスタタイル化したデータ。森林の林相分布を地図上で確認する際に利用できる。',
		attribution: '林野庁',
		location: '大分県',
		tags: ['森林', '林相図'],
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
