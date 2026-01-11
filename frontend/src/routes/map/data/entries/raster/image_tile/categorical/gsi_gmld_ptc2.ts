import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import { WEB_MERCATOR_WORLD_BBOX } from '$routes/map/data/entries/meta_data/_bounds';
import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'gsi_gmld_ptc2',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/gmld_ptc2/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '植生（樹木被覆率）',
		attribution: '国土地理院',
		description: '© 国土地理院・千葉大学・協働機関',
		location: '世界',
		tags: ['植生図', '樹木被覆率', '森林'],
		minZoom: 0,
		maxZoom: 7,
		tileSize: 256,
		bounds: WEB_MERCATOR_WORLD_BBOX,
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#ptc2',
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_0
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		resampling: 'nearest',
		legend: {
			type: 'category',
			name: '樹木被覆率',
			colors: [
				'#FFFFFF', // 0～20%
				'#C8FFC8', // 20～40%
				'#64FF64', // 40～60%
				'#00B400', // 60～80%
				'#006400', // 80～100%
				'#00C8FF' // 水部 (Water bodies)
			],
			labels: ['0～20%', '20～40%', '40～60%', '60～80%', '80～100%', '水部']
		}
	}
};

export default entry;
