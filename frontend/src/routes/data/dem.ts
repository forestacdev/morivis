export const DEM_DATA_TYPE = {
	mapbox: 0.0,
	gsi: 1.0,
	terrarium: 2.0
} as const;

export type DemDataType = typeof DEM_DATA_TYPE;
export type DemDataTypeKey = keyof DemDataType;

export type DemData = {
	id: string;
	name: string;
	tiles: string[];
	tileSize: number;
	minzoom: number;
	maxzoom: number;
	bbox: [number, number, number, number];
	attribution: string;
	demType: DemDataTypeKey;
};

export const demLayers: DemData[] = [
	{
		id: 'dem_10b',
		name: '基盤地図情報数値標高モデル DEM10B',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 1,
		maxzoom: 14,
		attribution: '国土地理院',
		bbox: [122.935, 20.425, 153.986, 45.551],
		demType: 'gsi'
	},
	// {
	// 	id: 'dem_5a',
	// 	name: '基盤地図情報数値標高モデル DEM5A',
	// 	tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/{z}/{x}/{y}.png'],
	// 	tileSize: 256,
	// 	minzoom: 1,
	// 	maxzoom: 15,
	// 	attribution: '国土地理院',
	// 	bbox: [122.935, 20.425, 153.986, 45.551],
	// 	demType: 'gsi'
	// },
	{
		id: 'dem_5b',
		name: '基盤地図情報数値標高モデル DEM5B',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem5b_png/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 1,
		maxzoom: 15,
		attribution: '国土地理院',
		bbox: [122.935, 20.425, 153.986, 45.551],
		demType: 'gsi'
	},
	{
		id: 'dem_5c',
		name: '基盤地図情報数値標高モデル DEM5C',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem5c_png/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 1,
		maxzoom: 15,
		attribution: '国土地理院',
		bbox: [122.935, 20.425, 153.986, 45.551],
		demType: 'gsi'
	},
	// {
	// 	id: 'tochigi_dem',
	// 	name: '栃木県 数値標高モデル(DEM)0.5m',
	// 	tiles: ['https://rinya-tochigi.geospatial.jp/2023/rinya/tile/terrainRGB/{z}/{x}/{y}.png'],
	// 	tileSize: 256,
	// 	minzoom: 2,
	// 	maxzoom: 18,
	// 	bbox: [139.326731, 36.199924, 140.291983, 37.155039],
	// 	attribution: '栃木県',
	// 	demType: 'mapbox'
	// },
	{
		id: 'kochi_dem',
		name: '高知県 数値標高モデル(DEM)0.5m',
		tiles: ['https://rinya-kochi.geospatial.jp/2023/rinya/tile/terrainRGB/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 2,
		maxzoom: 18,
		bbox: [132.479888, 32.702505, 134.31367, 33.882997],
		attribution: '高知県',
		demType: 'mapbox'
	},
	// {
	//     id: 'hyougo_dem',
	//     name: '兵庫県 数値標高モデル(DEM)0.5m',
	//     tiles: ['https://rinya-hyogo.geospatial.jp/2023/rinya/tile/terrainRGB/{z}/{x}/{y}.png'],
	//     tileSize: 256,
	//     minzoom: 2,
	//     maxzoom: 18,
	//     bbox: [134.252809, 34.156129, 135.468591, 35.674667],
	//     attribution: '兵庫県',

	//     demType: 'mapbox',
	// },
	{
		id: 'hyougo_dem',
		name: '兵庫県 DEM 1m',
		tiles: ['https://tiles.gsj.jp/tiles/elev/hyogodem/{z}/{y}/{x}.png'],
		tileSize: 256,
		minzoom: 2,
		maxzoom: 17,
		bbox: [134.252809, 34.156129, 135.468591, 35.674667],
		attribution: '兵庫県',
		demType: 'gsi'
	},
	{
		id: 'hyougo_dsm',
		name: '兵庫県 DSM 1m',
		tiles: ['https://tiles.gsj.jp/tiles/elev/hyogodsm/{z}/{y}/{x}.png'],
		tileSize: 256,
		minzoom: 2,
		maxzoom: 17,
		bbox: [134.252809, 34.156129, 135.468591, 35.674667],
		attribution: '兵庫県',
		demType: 'gsi'
	},
	{
		id: 'tokyo',
		name: '東京都',
		tiles: ['https://tiles.gsj.jp/tiles/elev/tokyo/{z}/{y}/{x}.png'],
		tileSize: 256,
		minzoom: 2,
		maxzoom: 19,
		bbox: [138.942922, 32.440258, 139.861054, 35.898368],
		attribution: '産総研シームレス標高タイル',
		demType: 'gsi'
	},
	{
		id: 'kanagawa',
		name: '神奈川県',
		tiles: ['https://tiles.gsj.jp/tiles/elev/kanagawa/{z}/{y}/{x}.png'],
		tileSize: 256,
		minzoom: 2,
		maxzoom: 18,
		bbox: [138.9401382, 35.1277755, 139.7471238, 35.6730819],
		attribution: '産総研シームレス標高タイル',
		demType: 'gsi'
	},
	{
		id: 'rinya_toyama_dem',
		name: '富山県 DEM',
		tiles: ['https://forestgeo.info/opendata/16_toyama/dem_terrainRGB_2021/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 2,
		maxzoom: 18,
		bbox: [136.7502827592869323, 36.2410658946756428, 137.8086007336188743, 37.0181547688286585],
		attribution: '林野庁',
		demType: 'mapbox'
	},
	{
		id: 'rinya_toyama_dchm',
		name: '富山県 dchm',
		tiles: ['https://forestgeo.info/opendata/16_toyama/dchm_terrainRGB_2021/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 2,
		maxzoom: 18,
		bbox: [136.7502827592869323, 36.2410658946756428, 137.8086007336188743, 37.0181547688286585],
		attribution: '林野庁',
		demType: 'mapbox'
	},
	{
		id: 'rinya_nagaoka_dem',
		name: '林野庁 DEM 0.5m（長岡地域2024）',
		tiles: ['https://cf192141.cloudfree.jp/nagaoka/dem_terrainRGB_15_2024/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 2,
		maxzoom: 18,
		bbox: [138.4714917, 37.145854, 139.2533006, 37.744387],
		attribution: '林野庁',
		demType: 'mapbox'
	},
	{
		id: 'rinya_nagaoka_dsm',
		name: '林野庁 DCHM 0.5m（長岡地域2024）',
		tiles: ['https://cf192141.cloudfree.jp/nagaoka/dchm_terrainRGB_15_2024/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 2,
		maxzoom: 18,
		bbox: [138.4714917, 37.145854, 139.2533006, 37.744387],
		attribution: '林野庁',
		demType: 'mapbox'
	},

	{
		id: 'astergdemv3',
		name: 'ASTER全球3次元地形データ',
		tiles: ['https://tiles.gsj.jp/tiles/elev/astergdemv3/{z}/{y}/{x}.png'],
		tileSize: 256,
		minzoom: 1,
		maxzoom: 12,
		attribution: '産総研シームレス標高タイル',
		bbox: [-180, -85.051129, 180, 85.051129],
		demType: 'gsi'
	},
	{
		id: 'gebco',
		name: 'GEBCO Grid',
		tiles: ['https://tiles.gsj.jp/tiles/elev/gebco/{z}/{y}/{x}.png'],
		tileSize: 256,
		minzoom: 0,
		maxzoom: 9,
		attribution: '産総研シームレス標高タイル',
		bbox: [-180, -85.051129, 180, 85.051129],
		demType: 'gsi'
	},
	{
		id: 'tilezen',
		name: 'Tilezen Joerd',
		tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 0,
		maxzoom: 15,
		attribution:
			'<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Tilezen Joerd: Attribution</a>',
		bbox: [-180, -85.051129, 180, 85.051129],
		demType: 'terrarium'
	},
	{
		id: 'lakedepth',
		name: '湖水深タイル',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/lakedepth/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 1,
		maxzoom: 14,
		attribution: '国土地理院',
		bbox: [122.935, 20.425, 153.986, 45.551],
		demType: 'gsi'
	},
	{
		id: 'gsigeoid',
		name: 'ジオイド・モデル「日本のジオイド2011」',
		tiles: ['https://tiles.gsj.jp/tiles/elev/gsigeoid/{z}/{y}/{x}.png'],
		tileSize: 256,
		minzoom: 0,
		maxzoom: 8,
		attribution: '産総研シームレス標高タイル',
		bbox: [120, 20, 150, 50],
		demType: 'gsi'
	}
	// {
	//     id: 'mixed',
	//     name: '統合DEM',
	//     tiles: ['https://tiles.gsj.jp/tiles/elev/mixed/{z}/{y}/{x}.png'],
	//     tileSize: 256,
	//     minzoom: 0,
	//     maxzoom: 15,
	//     attribution: '産総研シームレス標高タイル',
	//     bbox: [-180, -85.051129, 180, 85.051129],
	//     demType: 'gsi',
	// },
];

export type DemEntry = {
	name: string;
	demType: DemDataTypeKey;
	url: string;
	attribution: string;
	sourceMinZoom: number;
	sourceMaxZoom: number;
	layerMinZoom?: number;
	layerMaxZoom?: number;
	bbox: [number, number, number, number];
};

export const demEntry: DemEntry = {
	name: demLayers[0].name,
	demType: demLayers[0].demType,
	url: demLayers[0].tiles[0],
	sourceMaxZoom: demLayers[0].maxzoom,
	sourceMinZoom: demLayers[0].minzoom,
	attribution: demLayers[0].attribution,
	bbox: demLayers[0].bbox
};
