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
		opacity: 0.7,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg',
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
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
		opacity: 0.7,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
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
		opacity: 0.7,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/gazo2/{z}/{x}/{y}.jpg',
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
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
		opacity: 0.7,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
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
		opacity: 0.7,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
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
		opacity: 0.7,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/blank/{z}/{x}/{y}.png',
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
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
		opacity: 0.7,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png',
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
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
		opacity: 0.7,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png',
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
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
		opacity: 0.7,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/slopemap/{z}/{x}/{y}.png',
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
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
		name: '傾斜区分図（岐阜県森林研究所）',
		dataType: 'raster',
		opacity: 0.7,
		url: 'https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/Gifu_2021Slpoe_2022_07_25_15_54/MapServer/tile/{z}/{y}/{x}',
		attribution:
			"<a href='https://www.forest.rd.pref.gifu.lg.jp/shiyou/CSrittaizu.html' target='_blank'>岐阜県森林研究所</a>",
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
		opacity: 0.7,
		url: 'https://map.ecoris.info/tiles/vege67hill/{z}/{x}/{y}.png',
		attribution:
			"<a href='https://map.ecoris.info/#contents' target='_blank'>エコリス地図タイル</a>",
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
		opacity: 0.7,
		url: 'https://gbank.gsj.jp/seamless/v2/api/1.2.1/tiles/{z}/{y}/{x}.png',
		attribution:
			"<a href='https://gbank.gsj.jp/seamless/index.html?lang=ja&' target='_blank'>産総研地質調査総合センター</a>",
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
		opacity: 0.7,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/afm/{z}/{x}/{y}.png',
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
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
		name: 'CS立体図（岐阜県）',
		dataType: 'raster',
		opacity: 0.7,
		url: 'https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/Gifu2021CS_Mosic/MapServer/tile/{z}/{y}/{x}',
		attribution:
			"<a href='https://www.forest.rd.pref.gifu.lg.jp/shiyou/CSrittaizu.html' target='_blank'>岐阜県森林研究所</a>",
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
		name: '岐阜県共有空間データ',
		dataType: 'raster',
		opacity: 0.7,
		url: 'https://mapdata.qchizu.xyz/gifu_pref_00/{z}/{x}/{y}.png',
		attribution:
			"<a href='https://info.qchizu.xyz/qchizu/reprint/' target='_blank'>Q地図タイル</a>",
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
		id: 'sekishoku_map',
		name: '赤色立体図10mメッシュ',
		dataType: 'raster',
		opacity: 0.7,
		url: 'https://cyberjapandata.gsi.go.jp/xyz/sekishoku/{z}/{x}/{y}.png',
		attribution: "<a href='https://www.rrim.jp/' target='_blank'>アジア航測株式会社</a>",
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
		opacity: 0.7,
		url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
		attribution: "&copy; <a href='http://osm.org/copyright'>OpenStreetMap</a> contributors",
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
		opacity: 0.7,
		url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}.png',
		attribution: "&copy; <a href='http://osm.org/copyright'>ESRI</a> contributors",
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
		opacity: 0.7,
		url: 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png',
		attribution: "&copy; <a href='http://osm.org/copyright'>ESRI</a> contributors",
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
		opacity: 0.7,
		url: 'https://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}.png',
		attribution: "&copy; <a href='http://osm.org/copyright'>ESRI</a> contributors",
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
		name: '美濃市_基本図',
		dataType: 'raster',
		opacity: 0.7,
		url: 'https://raw.githubusercontent.com/forestacdev/rastertile-poc/main/tiles/{z}/{x}/{y}.webp',
		attribution: '美濃市',
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
