import type { RasterImageEntry, RasterCategoricalStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/style';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'ecoris_tanbo',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://map.ecoris.info/tiles/tanbo/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '田んぼ分布図',
		sourceDataName: '田んぼ（自然環境保全基礎調査 植生調査結果GISデータ）',
		attribution: 'エコリス地図タイル',
		location: '全国',
		minZoom: 5,
		maxZoom: 15,
		tileSize: 256,
		tags: ['田んぼ'],
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		downloadUrl: 'https://map.ecoris.info/#contents',
		xyzImageTile: { x: 3605, y: 1615, z: 12 }
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		legend: {
			type: 'category',
			name: '',
			colors: ['#02FF02'],
			labels: ['水田雑草群落']
		}
	}
};

export default entry;
