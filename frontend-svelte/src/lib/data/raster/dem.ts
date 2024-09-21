import type { DemEntry, Region } from '$lib/data/types';

export type DemLayer = {
	id: string;
	name: string;
	tiles: string[];
	tileSize: number;
	minzoom: number;
	maxzoom: number;
	bbox?: [number, number, number, number];
	attribution: string;
	location: Region[];
	demType: DemDataTypeKey;
};

export const demLayers: DemLayer[] = [
	{
		id: 'mino_dem',
		name: '美濃市 数値標高モデル(DEM)5m',
		tiles: [
			'https://raw.githubusercontent.com/forestacdev/mino-terrain-rgb-poc/main/tiles/{z}/{x}/{y}.png'
		],
		tileSize: 256,
		minzoom: 8,
		maxzoom: 15,
		bbox: [136.8384501982101256, 35.5104054980035997, 136.9790745399003526, 35.652440556937357],
		attribution: '国土数値情報',
		location: ['美濃市'],
		demType: 'gsi'
	},
	{
		id: 'dem_10b',
		name: '基盤地図情報数値標高モデル DEM10B',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 1,
		maxzoom: 14,
		attribution: '国土地理院',
		location: ['全国'],
		demType: 'gsi'
	},
	{
		id: 'dem_5a',
		name: '基盤地図情報数値標高モデル DEM5A',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 1,
		maxzoom: 15,
		attribution: '国土地理院',
		location: ['全国'],
		demType: 'gsi'
	},
	{
		id: 'dem_5b',
		name: '基盤地図情報数値標高モデル DEM5B',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem5b_png/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 1,
		maxzoom: 15,
		attribution: '国土地理院',
		location: ['全国'],
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
		location: ['全国'],
		demType: 'gsi'
	},
	{
		id: 'astergdemv3',
		name: 'ASTER全球3次元地形データ',
		tiles: ['https://tiles.gsj.jp/tiles/elev/astergdemv3/{z}/{y}/{x}.png'],
		tileSize: 256,
		minzoom: 1,
		maxzoom: 12,

		attribution: '国土地理院',
		location: ['全国'],
		demType: 'gsi'
	},
	{
		id: 'japan250',
		name: '日本周辺250mメッシュ(海陸統合DEM)',
		tiles: ['https://tiles.gsj.jp/tiles/elev/japan250/{z}/{y}/{x}.png'],
		tileSize: 256,
		minzoom: 1,
		maxzoom: 8,
		attribution: '国土地理院',
		location: ['全国'],
		demType: 'gsi'
	},
	{
		id: 'tochigi_dem',
		name: '栃木県 数値標高モデル(DEM)0.5m',
		tiles: ['https://rinya-tochigi.geospatial.jp/2023/rinya/tile/terrainRGB/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 2,
		maxzoom: 18,
		bbox: [139.326731, 36.199924, 140.291983, 37.155039],
		attribution: '栃木県',
		location: ['栃木県'],
		demType: 'rgb'
	},
	{
		id: 'kochi_dem',
		name: '高知県 数値標高モデル(DEM)0.5m',
		tiles: ['https://rinya-kochi.geospatial.jp/2023/rinya/tile/terrainRGB/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 2,
		maxzoom: 18,
		bbox: [132.479888, 32.702505, 134.31367, 33.882997],
		attribution: '高知県',
		location: ['高知県'],
		demType: 'rgb'
	},
	{
		id: 'hyougo_dem',
		name: '兵庫県 数値標高モデル(DEM)0.5m',
		tiles: ['https://rinya-hyogo.geospatial.jp/2023/rinya/tile/terrainRGB/{z}/{x}/{y}.png'],
		tileSize: 256,
		minzoom: 2,
		maxzoom: 18,
		bbox: [134.252809, 34.156129, 135.468591, 35.674667],
		attribution: '兵庫県',
		location: ['兵庫県'],
		demType: 'rgb'
	},
	{
		id: 'hyougo_dem',
		name: '兵庫県 DEM 1m',
		tiles: ['https://tiles.gsj.jp/tiles/elev/hyogodem/{z}/{y}/{x}.png'],
		tileSize: 256,
		minzoom: 2,
		maxzoom: 17,
		bbox: [134.252809, 34.156129, 135.468591, 35.674667],
		attribution: '兵庫県',
		location: ['兵庫県'],
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
		location: ['兵庫県'],
		demType: 'gsi'
	}
];

const rasterPaint = {
	'raster-saturation': 0,
	'raster-hue-rotate': 0,
	'raster-brightness-min': 0,
	'raster-brightness-max': 1,
	'raster-contrast': 0
};

export const DEM_DATA_TYPE = {
	rgb: 1,
	gsi: 2
} as const;

export type DemDataType = typeof DEM_DATA_TYPE;
export type DemDataTypeKey = keyof DemDataType;

export const demEntry: DemEntry = {
	id: 'custom-rgb-dem',
	tileId: demLayers[0].id,
	name: demLayers[0].name,
	dataType: 'raster',
	geometryType: 'dem',
	demType: demLayers[0].demType,
	protocolKey: 'customrgbdem',
	url: demLayers[0].tiles[0],
	sourceMaxZoom: demLayers[0].maxzoom,
	sourceMinZoom: demLayers[0].minzoom,
	opacity: 1.0,
	attribution: demLayers[0].attribution,
	location: demLayers[0].location,
	bbox: demLayers[0].bbox,
	visible: true,
	clickable: false,
	styleKey: 'デフォルト',
	style: {
		raster: [
			{
				name: 'デフォルト',
				paint: rasterPaint
			}
		]
	}
};
