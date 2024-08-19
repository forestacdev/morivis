import type {
	SourceSpecification,
	LayerSpecification,
	FillLayerSpecification,
	LineLayerSpecification,
	SymbolLayerSpecification,
	CircleLayerSpecification,
	HeatmapLayerSpecification,
	FillExtrusionLayerSpecification,
	RasterLayerSpecification,
	HillshadeLayerSpecification,
	BackgroundLayerSpecification
} from 'maplibre-gl';
import { GEOJSON_BASE_PATH } from '$lib/constants';

export type BaseMapEntry = {
	type: 'raster';
	tiles: string[];
	minzoom: number;
	maxzoom: number;
	tileSize: number;
	attribution: string;
};

export const backgroundSources: { [_: string]: BaseMapEntry } = {
	全国最新写真: {
		type: 'raster',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
	},
	'空中写真（1979年頃）': {
		type: 'raster',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/gazo2/{z}/{x}/{y}.jpg'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
	},
	地理院標準地図: {
		type: 'raster',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
	},
	地理院淡色地図: {
		type: 'raster',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
	},
	地理院白地図: {
		type: 'raster',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/blank/{z}/{x}/{y}.png'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
	},
	色別標高図: {
		type: 'raster',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
	},

	陰影起伏図: {
		type: 'raster',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
	},
	傾斜量図白黒: {
		type: 'raster',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/slopemap/{z}/{x}/{y}.png'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
	},
	'傾斜区分図（岐阜県森林研究所）': {
		type: 'raster',
		tiles: [
			'https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/Gifu_2021Slpoe_2022_07_25_15_54/MapServer/tile/{z}/{y}/{x}'
		],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution:
			"<a href='https://www.forest.rd.pref.gifu.lg.jp/shiyou/CSrittaizu.html' target='_blank'>岐阜県森林研究所</a>"
	},
	植生図: {
		type: 'raster',
		tiles: ['https://map.ecoris.info/tiles/vege67hill/{z}/{x}/{y}.png'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution:
			"<a href='https://map.ecoris.info/#contents' target='_blank'>エコリス地図タイル</a>"
	},
	シームレス地質図: {
		type: 'raster',
		tiles: ['https://gbank.gsj.jp/seamless/v2/api/1.2.1/tiles/{z}/{y}/{x}.png'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution:
			"<a href='https://gbank.gsj.jp/seamless/index.html?lang=ja&' target='_blank'>産総研地質調査総合センター</a>"
	},
	活断層図: {
		type: 'raster',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/afm/{z}/{x}/{y}.png'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
	},
	'CS立体図（岐阜県）': {
		type: 'raster',
		tiles: [
			'https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/Gifu2021CS_Mosic/MapServer/tile/{z}/{y}/{x}'
		],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution:
			"<a href='https://www.forest.rd.pref.gifu.lg.jp/shiyou/CSrittaizu.html' target='_blank'>岐阜県森林研究所</a>"
	},
	岐阜県共有空間データ: {
		type: 'raster',
		tiles: ['https://mapdata.qchizu.xyz/gifu_pref_00/{z}/{x}/{y}.png'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution:
			"<a href='https://info.qchizu.xyz/qchizu/reprint/' target='_blank'>Q地図タイル</a>"
	},
	赤色立体図10mメッシュ: {
		type: 'raster',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/sekishoku/{z}/{x}/{y}.png'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution: "<a href='https://www.rrim.jp/' target='_blank'>アジア航測株式会社</a>"
	},
	'Open Street Map': {
		type: 'raster',
		tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution: "&copy; <a href='http://osm.org/copyright'>OpenStreetMap</a> contributors"
	},
	'Esri World Street': {
		type: 'raster',
		tiles: [
			'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}.png'
		],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution: "&copy; <a href='http://osm.org/copyright'>ESRI</a> contributors"
	},
	'Esri World Imagery': {
		type: 'raster',
		tiles: [
			'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png'
		],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution: "&copy; <a href='http://osm.org/copyright'>ESRI</a> contributors"
	}
};

type LayerPaint<T, U> = { name: string; paint: T; layout?: U };

// LayerStyle に拡張された LayerSpecification 型を使用
type LayerStyle = {
	fill?: LayerPaint<FillLayerSpecification['paint'], FillLayerSpecification['layout']>[];
	line?: LayerPaint<LineLayerSpecification['paint'], LineLayerSpecification['layout']>[];
	symbol?: LayerPaint<SymbolLayerSpecification['paint'], SymbolLayerSpecification['layout']>[];
	circle?: LayerPaint<CircleLayerSpecification['paint'], CircleLayerSpecification['layout']>[];
	heatmap?: LayerPaint<HeatmapLayerSpecification['paint'], HeatmapLayerSpecification['layout']>[];
	fillExtrusion?: LayerPaint<
		FillExtrusionLayerSpecification['paint'],
		FillExtrusionLayerSpecification['layout']
	>[];
	raster?: LayerPaint<RasterLayerSpecification['paint'], RasterLayerSpecification['layout']>[];
	hillshade?: LayerPaint<
		HillshadeLayerSpecification['paint'],
		HillshadeLayerSpecification['layout']
	>[];
	background?: LayerPaint<
		BackgroundLayerSpecification['paint'],
		BackgroundLayerSpecification['layout']
	>[];
};
const rasterPaint = {
	'raster-saturation': 0,
	'raster-hue-rotate': 0,
	'raster-brightness-min': 0,
	'raster-brightness-max': 1,
	'raster-contrast': 0
};

export type LayerEntry = {
	id: string;
	name: string;
	type:
		| 'raster'
		| 'vector-polygon'
		| 'vector-line'
		| 'vector-point'
		| 'vector-label'
		| 'geojson-polygon'
		| 'geojson-line'
		| 'geojson-point'
		| 'geojson-label';
	path: string;
	attribution: string;
	minzoom?: number;
	maxzoom?: number;
	opacity: number;
	style_key?: string;
	style?: LayerStyle;
	visible: boolean;
	show_label?: boolean;
	legendId?: string; // legends.ts のキーに対応
	remarks?: string; // 備考
};

export type CategoryEntry = {
	categoryId: string;
	categoryName: string;
	layers: LayerEntry[];
};

export const layerData: LayerEntry[] = [
	{
		id: 'ENSYURIN_pole',
		name: 'サインポール',
		type: 'geojson-point',
		opacity: 0.7,
		path: `${GEOJSON_BASE_PATH}/ENSYURIN_pole.geojson`,
		attribution: '森林文化アカデミー',
		visible: true,
		style_key: 'デフォルト',
		style: {
			circle: [
				{
					name: 'デフォルト',
					paint: {
						'circle-color': '#ff0000',
						'circle-radius': 10,
						'circle-stroke-width': 1
					}
				}
			]
		}
	},
	{
		id: 'ENSYURIN_MITI',
		name: '演習林路網',
		type: 'geojson-line',
		opacity: 0.7,
		path: `${GEOJSON_BASE_PATH}/ENSYURIN_MITI.geojson`,
		attribution: '森林文化アカデミー',
		visible: true,
		style_key: 'デフォルト',
		style: {
			line: [
				{
					name: 'デフォルト',
					paint: {
						'line-color': '#221f1b',
						'line-width': 3
					}
				}
			]
		}
	},
	{
		id: 'ENSYURIN_KAWA',
		name: '川',
		type: 'geojson-line',
		opacity: 0.7,
		path: `${GEOJSON_BASE_PATH}/KAWA.geojson`,
		attribution: '森林文化アカデミー',
		visible: true,
		style_key: 'デフォルト',
		style: {
			line: [
				{
					name: 'デフォルト',
					paint: {
						'line-width': 5,
						'line-color': '#0f7acc'
					}
				}
			]
		}
	},
	{
		id: 'ENSYURIN_rinhanzu',
		name: '演習林林班図',
		type: 'geojson-polygon',
		opacity: 0.7,
		path: `${GEOJSON_BASE_PATH}/ENSYURIN_rinhanzu.geojson`,
		attribution: '森林文化アカデミー',
		visible: true,
		show_label: true,
		style_key: '樹種ごとの色分け',
		style: {
			fill: [
				{
					name: '樹種ごとの色分け',
					paint: {
						'fill-color': [
							'match',
							['get', '樹種'],
							'スギ',
							'#399210', // スギ
							'ヒノキ',
							'#4ADDA5', // ヒノキ
							'アカマツ',
							'#DD2B2B', // アカマツ
							'スラッシュマツ',
							'#B720BF', // スラッシュマツ
							'広葉樹',
							'#EBBC22', // 広葉樹
							'草地',
							'#2351E5', // 草地
							'その他岩石',
							'#D98F34', // その他岩石
							'#000000' // デフォルトの色（該当しない場合）
						],
						'fill-outline-color': '#000000'
					}
				},
				{
					name: '林班',
					paint: {
						'fill-color': [
							'match',
							['get', '林班'],
							1,
							'#DD2B2B',
							2,
							'#0043a7', // ヒノキ
							3,
							'#f0e000', // アカマツ
							'#000000' // デフォルトの色（該当しない場合）
						],
						'fill-outline-color': '#000000'
					}
				},
				{
					name: 'スギ林',
					paint: {
						'fill-color': [
							'match',
							['get', '樹種'],
							'スギ',
							'#399210', // スギ
							'#000000' // デフォルトの色（該当しない場合）
						],
						'fill-outline-color': '#000000'
					}
				},
				{
					name: '面積ごとの色分け',
					paint: {
						// fill-color で連続値に基づいた色を設定
						'fill-color': [
							'interpolate',
							['linear'], // 線形補間
							['get', '面積'], // プロパティ 'density' に基づいて色を変える
							0,
							'#f8d5cc',
							1,
							'#6e40e6'
						]
					}
				}
			],
			line: [
				{
					name: 'デフォルト',
					paint: {
						'line-color': '#000000',
						'line-width': 1.5
					}
				}
			],
			symbol: [
				{
					name: 'デフォルト',
					paint: {
						'text-color': '#000000',
						'text-halo-color': '#e0e0e0',
						'text-halo-width': 2,
						'text-opacity': 1
					},
					layout: {
						visibility: 'visible',
						'text-field': [
							'match',
							['get', '樹種'],
							['広葉樹'],
							['to-string', ['concat', ['get', '小林班ID'], '\n', ['get', '樹種']]],
							['草地'],
							['to-string', ['concat', ['get', '小林班ID'], '\n', ['get', '樹種']]],
							['その他岩石'],
							['to-string', ['concat', ['get', '小林班ID'], '\n', ['get', '樹種']]],
							[
								'to-string',
								[
									'concat',
									['get', '小林班ID'],
									'\n',
									['get', '樹種'],
									' ',
									['+', ['get', '林齢'], 3],
									'年生'
								]
							]
						],
						'text-max-width': 12,
						'text-size': 12
						// "text-variable-anchor": ["top", "bottom", "left", "right"],
						// "text-radial-offset": 0.5,
						// "text-justify": "auto",
					}
				}
			]
		}
	},

	{
		id: 'seamlessphoto',
		name: '1987年-1990年',
		type: 'raster',
		opacity: 0.7,
		path: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',
		attribution: '地理院タイル',
		visible: false,
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
		id: 'gazo2',
		name: '空中写真(1979年頃)',
		type: 'raster',
		opacity: 0.7,
		path: 'https://cyberjapandata.gsi.go.jp/xyz/gazo2/{z}/{x}/{y}.jpg',
		attribution: '地理院タイル',
		visible: false,
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
		id: 'std',
		name: '標準地図',
		type: 'raster',
		opacity: 0.7,
		path: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
		attribution: '地理院タイル',
		visible: false,
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
