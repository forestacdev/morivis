import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/data/types/raster';

export const imageTileBaseMapEntry: RasterImageEntry<RasterBaseMapStyle>[] = [
	{
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
	},
	{
		id: 'gsi_seamlessphoto',
		type: 'raster',
		format: {
			type: 'image',
			url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'
		},
		metaData: {
			name: '全国最新写真',
			description: '国土地理院の全国最新写真',
			downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#seamlessphoto',
			attribution: '国土地理院',
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
	},
	// CS立体図
	{
		id: 'gifu_cs_map',
		type: 'raster',
		format: {
			type: 'image',
			url: 'https://forestgeo.info/opendata/21_gifu/csmap_2023/{z}/{x}/{y}.webp'
		},
		metaData: {
			name: 'CS立体図',
			description: 'CS立体図',
			attribution: '岐阜県森林研究所',
			downloadUrl: 'https://www.geospatial.jp/ckan/dataset/rinya-gifu-maptiles',
			location: '岐阜県',
			minZoom: 8,
			maxZoom: 18,
			tileSize: 256,
			xyzImageTile: null,
			bounds: [136.1828594, 34.9090933, 137.8301219, 36.7868122],
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
	},
	// シームレス地質図
	{
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
	}
];
