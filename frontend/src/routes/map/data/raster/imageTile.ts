import type { RasterEntry } from '$map/data/types/raster';

export const imageTileEntry: RasterEntry[] = [
	{
		id: 'gsi_std',
		type: 'raster',
		format: {
			type: 'image',
			url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'
		},
		metaData: {
			name: '地理院標準地図',
			description: '地理院標準地図',
			attribution: '国土地理院',
			location: '全国',
			minZoom: 1,
			maxZoom: 18,
			xyzImageTile: null,
			bounds: null
		},
		interaction: {
			clickable: false,
			overlay: false,
			legend: null
		},
		style: {
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
		},
		debug: false,
		extension: {}
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
			description: '全国最新写真',
			attribution: '国土地理院',
			location: '全国',
			minZoom: 1,
			maxZoom: 18,
			xyzImageTile: null,
			bounds: null
		},
		interaction: {
			clickable: false,
			overlay: false,
			legend: null
		},
		style: {
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
		},
		debug: false,
		extension: {}
	},
	{
		id: 'gifu_cs_mao',
		type: 'raster',
		format: {
			type: 'image',
			url: 'https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/Gifu2021CS_Mosic/MapServer/tile/{z}/{y}/{x}'
		},
		metaData: {
			name: 'CS立体図',
			description: 'CS立体図',
			attribution: '岐阜県森林研究所',
			location: '岐阜県',
			minZoom: 1,
			maxZoom: 18,
			xyzImageTile: null,
			bounds: null
		},
		interaction: {
			clickable: false,
			overlay: false,
			legend: null
		},
		style: {
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
		},
		debug: false,
		extension: {}
	}
];


