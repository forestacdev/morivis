import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/meta_data/bounds';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: '',
	type: 'raster',
	format: {
		type: 'image',
		url: ''
	},
	metaData: {
		name: '',
		description: '',
		attribution: 'カスタムデータ',
		location: '不明',
		tags: [],
		minZoom: 1,
		maxZoom: 24,
		tileSize: 256,
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		downloadUrl: '',
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_9
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'categorical',
		opacity: 0.7,
		legend: {
			type: 'category',
			name: '傾斜',
			colors: [
				'#FFFFFF',
				'#A2E0CB',
				'#268F1E',
				'#95E537',
				'#E7E539',
				'#E35CC2',
				'#CC000D',
				'#8F086A'
			],
			labels: [
				'0 - 10度',
				'10.1 - 15度',
				'15.1 - 20度',
				'20.1 - 25度',
				'25.1 - 30度',
				'30.1 - 35度',
				'35.1 - 40度',
				'40.1度以上'
			]
		}
	}
};

export default entry;
