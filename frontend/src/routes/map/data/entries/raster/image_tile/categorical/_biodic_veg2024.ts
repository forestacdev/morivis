import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'biodic_veg2024',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://www.biodic.go.jp/kiso/vg/tile/veg2024raster/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '現存植生図2024',
		sourceDataName: '現存植生図2024',
		description:
			'全国の現存する植生を1/25,000縮尺で区分した地図。森林・草地・農地などの植生分布を確認する際に利用できる。',
		attribution: '環境省 生物多様性センター',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/biodic_veg2024tile',
		location: '全国',
		minZoom: 5,
		maxZoom: 16,
		tileSize: 256,
		tags: ['植生図'],
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_9
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		resampling: 'nearest',
		legend: {
			type: 'category',
			name: '現存植生図2024',
			colors: [],
			labels: []
		}
	}
};

export default entry;
