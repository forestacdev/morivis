import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'gsi_slopemap',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/slopemap/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '傾斜量図',
		description: '',
		attribution: '国土地理院',
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#slopemap',
		location: '全国',
		minZoom: 3,
		maxZoom: 15,
		tileSize: 256
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'categorical',
		opacity: 0.6,
		legend: {
			type: 'gradient',
			name: '傾斜',
			colors: ['#FFFFFF', '#000000'],
			range: [0, 90],
			unit: '度'
		}
	}
};

export default entry;
