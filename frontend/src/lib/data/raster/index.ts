import type { RasterEntry } from '$lib/data/types';

const rasterPaint = {
	'raster-saturation': 0,
	'raster-hue-rotate': 0,
	'raster-brightness-min': 0,
	'raster-brightness-max': 1,
	'raster-contrast': 0
};

export const rasterEntries: RasterEntry[] = [
	{
		id: 'ortho_photo',
		name: 'オルソ写真',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 1,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg',
		attribution: '国土地理院',
		location: ['全国'],
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
	},
	{
		id: 'latest_photo',
		name: '全国最新写真',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 1,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',
		attribution: '国土地理院',
		location: ['全国'],
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
	},
	{
		id: 'aerial_photo_1979',
		name: '空中写真（1979年頃）',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 1,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/gazo2/{z}/{x}/{y}.jpg',
		attribution: '国土地理院',
		location: ['全国'],
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
	},
	{
		id: 'aerial_photo_1974_1978',
		name: '空中写真（1974年～1978年頃）',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 1,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/gazo1/{z}/{x}/{y}.jpg',
		attribution: '国土地理院',
		sourceMaxZoom: 17,
		sourceMinZoom: 10,
		location: ['全国'],
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
	},
	{
		id: 'std_map',
		name: '地理院標準地図',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 0.7,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
		attribution: '国土地理院',
		location: ['全国'],
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
	},
	{
		id: 'pale_map',
		name: '地理院淡色地図',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 0.7,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',
		attribution: '国土地理院',
		location: ['全国'],
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
	},
	{
		id: 'blank_map',
		name: '地理院白地図',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 0.7,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/blank/{z}/{x}/{y}.png',
		attribution: '国土地理院',
		location: ['全国'],
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
	},
	{
		id: 'relief_map',
		name: '色別標高図',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 0.7,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png',
		attribution: '国土地理院',
		location: ['全国'],
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
	},
	{
		id: 'hillshade_map',
		name: '陰影起伏図',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 0.7,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png',
		attribution: '国土地理院',
		location: ['全国'],
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
	},
	{
		id: 'slope_map_bw',
		name: '傾斜量図白黒',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 0.7,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/slopemap/{z}/{x}/{y}.png',
		attribution: '国土地理院',
		location: ['全国'],
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
	},
	{
		id: 'gifu_slope_map',
		name: '傾斜区分図',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 0.7,
		url: 'https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/Gifu_2021Slpoe_2022_07_25_15_54/MapServer/tile/{z}/{y}/{x}',
		attribution: '岐阜県森林研究所',
		location: ['岐阜県'],
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
	},
	{
		id: 'vege_map',
		name: '植生図',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 0.7,
		url: 'https://map.ecoris.info/tiles/vege67hill/{z}/{x}/{y}.png',
		attribution: 'エコリス地図タイル',
		location: ['全国'],
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
	},
	{
		id: 'seamless_geological_map',
		name: 'シームレス地質図',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 0.7,
		url: 'https://gbank.gsj.jp/seamless/v2/api/1.2.1/tiles/{z}/{y}/{x}.png',
		attribution: '産総研地質調査総合センター',
		location: ['全国'],
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
	},
	{
		id: 'active_fault_map',
		name: '活断層図',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 0.7,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/afm/{z}/{x}/{y}.png',
		attribution: '国土地理院',
		location: ['全国'],
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
	},
	{
		id: 'gifu_cs_map',
		name: 'CS立体図',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 0.7,
		location: ['岐阜県'],
		url: 'https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/Gifu2021CS_Mosic/MapServer/tile/{z}/{y}/{x}',
		attribution: '岐阜県森林研究所',
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
	},
	{
		id: 'gifu_shared_space',
		name: '共有空間データ',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 0.7,
		url: 'https://mapdata.qchizu.xyz/gifu_pref_00/{z}/{x}/{y}.png',
		attribution: 'Q地図タイル',
		location: ['岐阜県'],
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
	},
	{
		id: 'osm_map',
		name: 'Open Street Map',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 0.7,
		url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
		attribution: '&copy; OpenStreetMap contributors',
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
	},
	{
		id: 'esri_world_street',
		name: 'Esri World Street',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 0.7,
		url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}.png',
		attribution:
			'Sources: Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, © OpenStreetMap contributors, and the GIS User Community',
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
	},
	{
		id: 'esri_world_imagery',
		name: 'Esri World Imagery',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 0.7,
		url: 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png',
		attribution:
			'Sources: Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, © OpenStreetMap contributors, and the GIS User Community',
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
	},
	{
		id: 'esri_world_topo',
		name: 'Esri World Topo',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 0.7,
		url: 'https://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}.png',
		attribution:
			'Sources: Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, © OpenStreetMap contributors, and the GIS User Community',
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
	},
	{
		id: 'mino_kihonz',
		name: '基本図',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 0.7,
		url: 'https://raw.githubusercontent.com/forestacdev/rastertile-poc/main/tiles/{z}/{x}/{y}.webp',
		attribution: '美濃市',
		location: ['美濃市'],
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
	},
	{
		id: 'rinya-tochigi-csmap',
		name: 'CS立体図',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 0.7,
		url: 'https://rinya-tochigi.geospatial.jp/2023/rinya/tile/csmap/{z}/{x}/{y}.png',
		attribution: '林野庁',
		location: ['栃木県'],
		tileImage: {
			x: 454,
			y: 199,
			z: 9
		},
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
	},
	{
		id: 'gsi-rinya',
		name: '国有林の空中写真',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 1,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/rinya/{z}/{x}/{y}.png',
		sourceMinZoom: 14,
		sourceMaxZoom: 18,
		layerMinZoom: 14,
		attribution: '国土地理院',
		location: ['全国'],
		tileImage: {
			x: 14515,
			y: 6390,
			z: 14
		},
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
	},
	{
		id: 'gsi-rinya_m',
		name: '民有林の空中写真',
		dataType: 'raster',
		geometryType: 'raster',
		opacity: 1,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/rinya_m/{z}/{x}/{y}.png',
		sourceMinZoom: 14,
		sourceMaxZoom: 18,
		layerMinZoom: 14,
		attribution: '国土地理院',
		location: ['全国'],
		tileImage: {
			x: 14427,
			y: 6452,
			z: 14
		},
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
	}
];
