import { IMAGE_TILE_XYZ, IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/meta_data/_bounds';
import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'gsi_slopemap',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/slopemap/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '全国傾斜量図',
		attribution: '国土地理院',
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#slopemap',
		location: '全国',
		tags: ['傾斜量図', '地形'],
		minZoom: 3,
		maxZoom: 15,
		tileSize: 256,
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_9,
		bounds: WEB_MERCATOR_JAPAN_BOUNDS
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		legend: {
			type: 'gradient',
			name: '傾斜',
			colors: ['#FFFFFF', '#000000'],
			ranges: [0, 90],
			unit: '度'
		}
	}
};

export default entry;
