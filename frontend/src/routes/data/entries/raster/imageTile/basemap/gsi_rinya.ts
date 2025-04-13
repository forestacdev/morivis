import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gsi_rinya',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/rinya/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '森林（国有林）の空中写真（林野庁）',
		description: '',
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#trinya',
		attribution: '国土地理院',
		location: '全国',
		minZoom: 14,
		maxZoom: 18,
		tileSize: 256,
		xyzImageTile: {
			x: 14515,
			y: 6390,
			z: 14
		},
		bounds: null,
		coverImage: null
	},
	interaction: {
		clickable: false,
		overlay: false
	},
	style: {
		type: 'basemap',
		opacity: 1.0,
		hueRotate: 0,
		brightnessMin: 0,
		brightnessMax: 1,
		saturation: 0,
		contrast: 0,
		raster: {
			paint: {},
			layout: {}
		}
	}
};

export default entry;
