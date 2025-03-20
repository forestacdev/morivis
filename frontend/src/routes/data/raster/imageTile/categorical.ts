import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/data/types/raster';

export const imageTileCategoricalEntry: RasterImageEntry<RasterCategoricalStyle>[] = [
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
			coverImage: null
		},
		interaction: {
			clickable: true,
			overlay: true
		},
		style: {
			type: 'categorical',
			opacity: 0.6,
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
			},
			raster: {
				paint: {},
				layout: {}
			}
		},
		debug: false,
		extension: {}
	},

	// 傾斜量図 地理院
	{
		id: 'gsi_slopemap',
		type: 'raster',
		format: {
			type: 'image',
			url: 'https://cyberjapandata.gsi.go.jp/xyz/slopemap/{z}/{x}/{y}.png'
		},
		metaData: {
			name: '傾斜量図',
			description: '傾斜量図　国土地理院',
			attribution: '国土地理院',
			location: '全国',
			minZoom: 3,
			maxZoom: 15,
			tileSize: 256,
			xyzImageTile: null,
			bounds: null,
			coverImage: null
		},
		interaction: {
			clickable: true,
			overlay: true
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
			},
			raster: {
				paint: {},
				layout: {}
			}
		},
		debug: false,
		extension: {}
	}
];
