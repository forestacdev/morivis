import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'gifu_slope_map',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/Gifu_2021Slpoe_2022_07_25_15_54/MapServer/tile/{z}/{y}/{x}'
	},
	metaData: {
		name: '傾斜区分図',
		description: '岐阜県の傾斜区分図',
		downloadUrl: 'https://www.forest.rd.pref.gifu.lg.jp/shiyou/sinrinwebmap.html',
		attribution: '岐阜県森林研究所',
		location: '岐阜県',
		tags: ['傾斜区分図', '地形'],
		minZoom: 1,
		maxZoom: 18,
		tileSize: 256,
		bounds: [136.1828594, 34.9090933, 137.8301219, 36.7868122]
	},
	interaction: {
		clickable: true
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
		}
	}
};

export default entry;
