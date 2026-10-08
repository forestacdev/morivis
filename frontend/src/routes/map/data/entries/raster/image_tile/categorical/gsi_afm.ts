import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import legend from './_legends/gsi_afm';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'gsi_afm',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/afm/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '活断層図（都市圏活断層図）',
		attribution: '国土地理院',
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#afm',
		location: '全国',
		tags: ['地形', '地震'],
		minZoom: 11,
		maxZoom: 16,
		tileSize: 256,
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_13,
		description:
			'活断層と周辺の地形を示した地図。整備地域の活断層の位置や分布を確認する際に利用できる。'
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		opacity: 1,
		resampling: 'linear',
		legend
	}
};

export default entry;
