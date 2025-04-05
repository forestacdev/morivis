import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gbank_seamless',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://gbank.gsj.jp/seamless/v2/api/1.3.1/tiles/{z}/{y}/{x}.png'
	},
	metaData: {
		name: '20万分の1日本シームレス地質図V2',
		description: '',
		downloadUrl: 'https://gbank.gsj.jp/seamless/v2/api/1.3.1/#tiles',
		attribution: '産総研地質調査総合センター',
		location: '全国',
		minZoom: 0,
		maxZoom: 13,
		tileSize: 256,
		xyzImageTile: {
			x: 1827,
			y: 777,
			z: 11
		},
		bounds: null,
		coverImage: null
	},
	interaction: {
		clickable: true,
		overlay: true
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
