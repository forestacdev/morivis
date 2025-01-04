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
			description: '国土地理院の電子国土基本図',
			attribution: '国土地理院',
			location: '全国',
			minZoom: 1,
			maxZoom: 18,
			tileSize: 256,
			xyzImageTile: null,
			bounds: null,
			legend: null
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
			description: '国土地理院の全国最新写真',
			attribution: '国土地理院',
			location: '全国',
			minZoom: 1,
			maxZoom: 18,
			tileSize: 256,
			xyzImageTile: null,
			bounds: null,
			legend: null
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
		},
		debug: false,
		extension: {}
	},
	// CS立体図
	{
		id: 'gifu_cs_map',
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
			tileSize: 256,
			xyzImageTile: null,
			bounds: [136.1828594, 34.9090933, 137.8301219, 36.7868122],
			legend: null
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
		},
		debug: false,
		extension: {}
	},
	// 傾斜区分図
	{
		id: 'gifu_slope_map',
		type: 'raster',
		format: {
			type: 'image',
			url: 'https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/Gifu_2021Slpoe_2022_07_25_15_54/MapServer/tile/{z}/{y}/{x}'
		},
		metaData: {
			name: '傾斜区分図',
			description: '岐阜県の傾斜区分図',
			attribution: '岐阜県森林研究所',
			location: '岐阜県',
			minZoom: 1,
			maxZoom: 18,
			tileSize: 256,
			xyzImageTile: null,
			bounds: [136.1828594, 34.9090933, 137.8301219, 36.7868122],
			legend: {
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
		},
		interaction: {
			clickable: true,
			overlay: true
		},
		style: {
			type: 'categorical',
			opacity: 0.6,
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
