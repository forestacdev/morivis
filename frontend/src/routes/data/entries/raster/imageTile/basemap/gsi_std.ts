import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gsi_std',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '地理院標準地図',
		description: '国土地理院の電子国土基本図',
		attribution: '国土地理院',
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#std',
		location: '全国',
		minZoom: 1,
		maxZoom: 18,
		tileSize: 256,
		xyzImageTile: null,
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
