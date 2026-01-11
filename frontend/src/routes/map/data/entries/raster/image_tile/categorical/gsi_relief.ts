import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/meta_data/bounds';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'gsi_relief',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '全国色別標高図',
		description: '色別標高図は、標高の変化を陰影と段彩の効果を用いて視覚的に表現したものです。',
		attribution: '国土地理院',
		location: '全国',
		tags: ['標高段彩図', '地形'],
		minZoom: 5,
		maxZoom: 15,
		tileSize: 256,
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#relief',
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_9
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'categorical',
		opacity: 0.7,
		legend: {
			type: 'gradient',
			name: '標高値',
			colors: ['#B43D09', '#B4491C', '#B4562D', '#B5A42D', '#46BABA'],
			ranges: [4000, 2000, 1000, 300, 0],
			unit: 'm'
		}
	}
};

export default entry;
