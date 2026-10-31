import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'soilmap_nfs',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://www2.ffpri.go.jp/soilmap/tile/nfs/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '国有林 林野土壌図',
		description:
			'国有林の森林土壌調査で作成された土壌図を画像タイルとして配信した地図。土壌の分布を把握する際に、図幅ごとの凡例・説明書を森林土壌デジタルマップで参照して利用できる。',
		attribution: '森林総研・森林土壌デジタルマップ',
		tags: ['土壌図', '国有林'],
		downloadUrl: 'https://www2.ffpri.go.jp/soilmap/data-src.html',
		location: '全国',
		minZoom: 1,
		maxZoom: 16,
		tileSize: 256,
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		xyzImageTile: {
			x: 14447,
			y: 6447,
			z: 14
		}
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
