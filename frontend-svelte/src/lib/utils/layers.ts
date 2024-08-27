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
import { GEOJSON_BASE_PATH, EXCLUDE_IDS_CLICK_LAYER } from '$lib/constants';
import { excludeIdsClickLayer } from '$lib/store/store';

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
	source_layer?: string;
	opacity: number;
	style_key: string;
	style?: LayerStyle;
	visible: boolean;
	show_label?: boolean;
	show_outline?: boolean;
	show_fill?: boolean;
	id_field?: string; // フィーチャーのIDとして使用するフィールド名
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
						'line-opacity': 0.8,
						'line-color': '#8e8e7b',
						'line-width': ['match', ['get', '種類'], ['林道'], 10, 5]
					},
					layout: {
						'line-join': 'bevel'
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
		id: 'TATEMONO',
		name: '建物',
		type: 'geojson-polygon',
		opacity: 0.5,
		path: `${GEOJSON_BASE_PATH}/TATEMONO.geojson`,
		attribution: '森林文化アカデミー',
		visible: true,
		show_label: true,
		show_outline: true,
		show_fill: false,
		style_key: '単色',
		style: {
			fill: [
				{
					name: '単色',
					paint: {
						'fill-color': '#ffffff'
					}
				}
			],
			line: [
				{
					name: 'デフォルト',
					paint: {
						'line-color': '#ff0000',
						'line-width': 1.5
					}
				}
			],
			symbol: [
				{
					name: 'デフォルト',
					paint: {
						'text-halo-color': '#000000',
						'text-halo-width': 2,
						'text-opacity': 1,
						'text-color': '#ffffff'
					},
					layout: {
						visibility: 'visible',
						'text-field': ['to-string', ['get', 'name']],
						'text-size': 14,
						'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
						'text-radial-offset': 0.5,
						'text-justify': 'auto',
						'icon-image': [
							'case',
							[
								'match',
								['get', 'name'],
								['森林総合教育センター(morinos)'],
								true,
								false
							],
							'morinosuマーク',
							['match', ['get', 'name'], ['アカデミーセンター'], true, false],
							'アカデミーマークアイコン',
							'dot-11'
						],
						'icon-size': [
							'case',
							[
								'match',
								['get', 'name'],
								['森林総合教育センター(morinos)'],
								true,
								false
							],
							0.4,
							['match', ['get', 'name'], ['アカデミーセンター'], true, false],
							0.3,
							1
						]
					}
				}
			]
		}
	},
	{
		id: 'ENSYURIN_rinhanzu',
		name: '演習林林班図',
		type: 'geojson-polygon',
		opacity: 0.5,
		path: `${GEOJSON_BASE_PATH}/ENSYURIN_rinhanzu.geojson`,
		attribution: '森林文化アカデミー',
		visible: true,
		show_label: true,
		show_outline: true,
		show_fill: true,
		id_field: '小林班ID',
		style_key: '単色',
		style: {
			fill: [
				{
					name: '単色',
					paint: {
						'fill-color': '#ffffff'
					}
				},
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
						]
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
						'line-color': '#ff0000',
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
		id: 'mino_kihonz',
		name: '美濃市_基本図',
		type: 'raster',
		opacity: 0.7,
		path: 'https://raw.githubusercontent.com/forestacdev/rastertile-poc/main/tiles/{z}/{x}/{y}.webp',
		attribution: '美濃市',
		visible: false,
		style_key: 'デフォルト',
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
		id: 'gsi_test',
		name: '等高線',
		type: 'vector-line',
		source_layer: 'contour',
		opacity: 0.7,
		path: 'https://cyberjapandata.gsi.go.jp/xyz/experimental_bvmap/{z}/{x}/{y}.pbf',
		attribution: '地理院ベクトル',
		maxzoom: 24,
		minzoom: 0,
		visible: false,
		style_key: '単色',
		style: {
			line: [
				{
					name: '単色',
					paint: {
						'line-color': '#ff0000',
						'line-width': 0.5
					}
				}
			]
		}
	},
	{
		id: 'contour',
		name: '等高線',
		type: 'vector-line',
		source_layer: 'contour',
		opacity: 0.7,
		path: 'https://cyberjapandata.gsi.go.jp/xyz/experimental_bvmap/{z}/{x}/{y}.pbf',
		attribution: '地理院ベクトル',
		maxzoom: 24,
		minzoom: 0,
		visible: false,
		style_key: '単色',
		style: {
			line: [
				{
					name: '単色',
					paint: {
						'line-color': '#ff0000',
						'line-width': 0.5
					}
				}
			]
		}
	},
	{
		id: 'elevation',
		name: '標高点',
		type: 'vector-point',
		source_layer: 'elevation',
		opacity: 0.7,
		path: 'https://cyberjapandata.gsi.go.jp/xyz/experimental_bvmap/{z}/{x}/{y}.pbf',
		attribution: '地理院ベクトル',
		maxzoom: 24,
		minzoom: 0,
		visible: false,
		show_fill: false,
		show_outline: false,
		show_label: false,
		style_key: 'デフォルト',
		style: {
			circle: [
				{
					name: '単色',
					paint: {
						'circle-color': '#ffffff',
						'circle-stroke-color': '#ff0000'
					}
				}
			]
		}
	},
	{
		id: 'gifu-nationalforest',
		name: '岐阜県国有林',
		type: 'vector-polygon',
		source_layer: 'A4519_21',
		opacity: 0.7,
		path: 'https://raw.githubusercontent.com/forestacdev/vector-tiles-gifu-nationalforest/main/tiles/{z}/{x}/{y}.pbf',
		attribution: '国土数値情報',
		maxzoom: 14,
		minzoom: 0,
		visible: false,
		id_field: 'A45_001',
		show_fill: true,
		show_outline: false,
		show_label: true,
		style_key: '単色',
		style: {
			fill: [
				{
					name: '単色',
					paint: {
						'fill-color': '#ffffff'
					}
				},
				{
					name: 'デフォルト',
					paint: {
						'fill-color': [
							'match',
							['get', 'A45_015'],
							['スギ'],
							'#3a9310',
							['ヒノキ'],
							'#4adea5',
							['アカマツ'],
							'#DD2B2B',
							['他Ｌ'],
							'#ecbd22',
							['天ヒノキ'],
							'#34eac2',
							'#000000'
						],
						'fill-outline-color': '#000000'
					}
				}
			],
			line: [
				{
					name: 'デフォルト',
					paint: {
						'line-color': '#ff0000',
						'line-width': 1.5
					}
				}
			],
			symbol: [
				{
					name: 'デフォルト',
					layout: {
						'text-field': [
							'case',
							['match', ['get', 'A45_015'], ['他Ｌ'], true, false],
							['to-string', ['concat', ['get', 'A45_013'], '\n', '広葉樹']],
							[
								'match',
								['get', 'A45_011'],
								['3142_林班_イ', '3147_林班_イ', '3147_林班_ロ', '3149_林班_イ'],
								true,
								false
							],
							['to-string', ['get', 'A45_013']],
							[
								'to-string',
								[
									'concat',
									['get', 'A45_013'],
									'\n',
									['get', 'A45_015'],
									' ',
									['+', ['get', 'A45_017'], 3],
									'年生'
								]
							]
						],
						'text-max-width': 12,
						'text-size': 12,
						'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
						'text-radial-offset': 0.5,
						'text-justify': 'auto'
					},
					paint: {
						'text-color': '#000000',
						'text-halo-color': '#FFFFFF',
						'text-halo-width': 1,
						'text-opacity': 1
					}
				}
			]
		}
	}
];

// sourcesの作成
export const createSourceItems = (layerDataEntries: LayerEntry[]) => {
	const sourceItems: { [_: string]: SourceSpecification } = {};

	layerDataEntries.forEach((layerEntry) => {
		const sourceId = `${layerEntry.id}_source`;

		if (layerEntry.type === 'raster') {
			sourceItems[sourceId] = {
				type: 'raster',
				tiles: [layerEntry.path],
				maxzoom: layerEntry.maxzoom ? layerEntry.maxzoom : 24,
				minzoom: layerEntry.minzoom ? layerEntry.minzoom : 0,
				tileSize: 256,
				attribution: layerEntry.attribution
			};
		} else if (
			layerEntry.type === 'vector-polygon' ||
			layerEntry.type === 'vector-line' ||
			layerEntry.type === 'vector-point'
		) {
			sourceItems[sourceId] = {
				type: 'vector',
				tiles: [layerEntry.path],
				maxzoom: layerEntry.maxzoom ? layerEntry.maxzoom : 24,
				minzoom: layerEntry.minzoom ? layerEntry.minzoom : 0,
				attribution: layerEntry.attribution
			};
		} else if (
			layerEntry.type === 'geojson-polygon' ||
			layerEntry.type === 'geojson-line' ||
			layerEntry.type === 'geojson-point'
		) {
			sourceItems[sourceId] = {
				type: 'geojson',
				data: layerEntry.path,
				generateId: true,
				attribution: layerEntry.attribution
			};
		} else {
			console.warn(`Unknown layer type: ${layerEntry.type}`);
		}
	});

	return sourceItems;
};

// layersの作成
export const createLayerItems = (layerDataEntries: LayerEntry[]) => {
	const layerItems: LayerSpecification[] = [];
	const symbolLayerItems: LayerSpecification[] = [];
	const excludeIds: string[] = []; // クリックイベントを除外するレイヤーID

	// const layerIdNameDict: { [_: string]: string } = {};

	layerDataEntries
		.filter((layerEntry) => layerEntry.visible)
		.reverse()
		.forEach((layerEntry, i) => {
			const layerId = `${layerEntry.id}`;
			const sourceId = `${layerEntry.id}_source`;

			if (layerEntry.type === 'raster') {
				layerItems.push({
					id: layerId,
					type: 'raster',
					source: sourceId,
					maxzoom: layerEntry.maxzoom ? layerEntry.maxzoom : 24,
					minzoom: layerEntry.minzoom ? layerEntry.minzoom : 0,
					paint: {
						'raster-opacity': layerEntry.opacity,
						...(layerEntry.style?.raster?.[0]?.paint ?? {})
					}
				});
				// layerIdNameDict[layerId] = layerEntry.name;
			} else if (layerEntry.type === 'vector-polygon') {
				const setStyele = layerEntry.style?.fill?.find(
					(item) => item.name === layerEntry.style_key
				);

				const layer = {
					id: layerId,
					type: 'fill',
					source: sourceId,
					'source-layer': layerEntry.source_layer,
					maxzoom: 24,
					minzoom: 0,
					paint: layerEntry.show_fill
						? {
								'fill-opacity': layerEntry.opacity,
								...setStyele?.paint
							}
						: {
								'fill-opacity': layerEntry.opacity,
								'fill-color': 'transparent'
							},
					layout: {
						...(layerEntry.style?.fill?.[0]?.layout ?? {})
					}
				} as LayerSpecification;

				layerItems.push(layer);
				// layerIdNameDict[layerId] = layerEntry.name;

				if (layerEntry.show_outline) {
					layerItems.push({
						id: `${layerId}_outline`,
						type: 'line',
						source: sourceId,
						'source-layer': layerEntry.source_layer,
						paint: {
							'line-opacity': layerEntry.opacity,
							...(layerEntry.style?.line?.[0]?.paint ?? {})
						},
						layout: {
							...(layerEntry.style?.line?.[0]?.layout ?? {})
						}
					});

					excludeIds.push(`${layerId}_outline`);
				}
				if (layerEntry.show_label) {
					symbolLayerItems.push({
						id: `${layerId}_label`,
						type: 'symbol',
						source: sourceId,
						'source-layer': layerEntry.source_layer,
						paint: {
							...(layerEntry.style?.symbol?.[0]?.paint ?? {})
						},
						layout: {
							...(layerEntry.style?.symbol?.[0]?.layout ?? {})
						}
					});

					excludeIds.push(`${layerId}_label`);
				}
			} else if (layerEntry.type === 'vector-line') {
				const setStyele = layerEntry.style?.line?.find(
					(item) => item.name === layerEntry.style_key
				);

				const layer = {
					id: layerId,
					type: 'line',
					source: sourceId,
					'source-layer': layerEntry.source_layer,
					maxzoom: 24,
					minzoom: 0,
					paint: {
						'line-opacity': layerEntry.opacity,
						...(layerEntry.style?.line?.[0]?.paint ?? {})
					},
					layout: {
						...(layerEntry.style?.line?.[0]?.layout ?? {})
					}
				} as LayerSpecification;

				layerItems.push(layer);
				// layerIdNameDict[layerId] = layerEntry.name;

				if (layerEntry.show_label) {
					symbolLayerItems.push({
						id: `${layerId}_label`,
						type: 'symbol',
						source: sourceId,
						'source-layer': layerEntry.source_layer,
						paint: {
							...(layerEntry.style?.symbol?.[0]?.paint ?? {})
						},
						layout: {
							...(layerEntry.style?.symbol?.[0]?.layout ?? {})
						}
					});

					excludeIds.push(`${layerId}_label`);
				}
			} else if (layerEntry.type === 'vector-point') {
				const setStyele = layerEntry.style?.circle?.find(
					(item) => item.name === layerEntry.style_key
				);

				const layer = {
					id: layerId,
					type: 'circle',
					source: sourceId,
					'source-layer': layerEntry.source_layer,
					maxzoom: 24,
					minzoom: 0,
					paint: {
						'circle-opacity': layerEntry.opacity,
						...(layerEntry.style?.circle?.[0]?.paint ?? {})
					},
					layout: {
						...(layerEntry.style?.circle?.[0]?.layout ?? {})
					}
				} as CircleLayerSpecification;

				layerItems.push(layer);
				// layerIdNameDict[layerId] = layerEntry.name;

				if (layerEntry.show_label) {
					symbolLayerItems.push({
						id: `${layerId}_label`,
						type: 'symbol',
						source: sourceId,
						'source-layer': layerEntry.source_layer,
						paint: {
							...(layerEntry.style?.symbol?.[0]?.paint ?? {})
						},
						layout: {
							...(layerEntry.style?.symbol?.[0]?.layout ?? {})
						}
					});

					excludeIds.push(`${layerId}_label`);
				}
			} else if (layerEntry.type === 'geojson-polygon') {
				const setStyele = layerEntry.style?.fill?.find(
					(item) => item.name === layerEntry.style_key
				);

				const layer = {
					id: layerId,
					type: 'fill',
					source: sourceId,
					paint: layerEntry.show_fill
						? {
								'fill-opacity': layerEntry.opacity,
								...setStyele?.paint
							}
						: {
								'fill-opacity': layerEntry.opacity,
								'fill-color': 'transparent'
							},
					layout: {
						...(layerEntry.style?.fill?.[0]?.layout ?? {})
					}
				} as LayerSpecification;

				layerItems.push(layer);
				// layerIdNameDict[layerId] = layerEntry.name;

				if (layerEntry.show_outline) {
					layerItems.push({
						id: `${layerId}_outline`,
						type: 'line',
						source: sourceId,
						paint: {
							'line-opacity': layerEntry.opacity,
							...(layerEntry.style?.line?.[0]?.paint ?? {})
						},
						layout: {
							...(layerEntry.style?.line?.[0]?.layout ?? {})
						}
					});
					excludeIds.push(`${layerId}_outline`);
				}
				if (layerEntry.show_label) {
					symbolLayerItems.push({
						id: `${layerId}_label`,
						type: 'symbol',
						source: sourceId,
						paint: {
							...(layerEntry.style?.symbol?.[0]?.paint ?? {})
						},
						layout: {
							...(layerEntry.style?.symbol?.[0]?.layout ?? {})
						}
					});
					excludeIds.push(`${layerId}_label`);
				}
			} else if (layerEntry.type === 'geojson-line') {
				layerItems.push({
					id: layerId,
					type: 'line',
					source: sourceId,
					paint: {
						'line-opacity': layerEntry.opacity,
						...(layerEntry.style?.line?.[0]?.paint ?? {})
					},
					layout: {
						...(layerEntry.style?.line?.[0]?.layout ?? {})
					}
				});

				symbolLayerItems.push({
					id: `${layerId}_label`,
					type: 'symbol',
					source: sourceId,
					paint: {
						...(layerEntry.style?.symbol?.[0]?.paint ?? {})
					},
					layout: {
						...(layerEntry.style?.symbol?.[0]?.layout ?? {})
					}
				});
				excludeIds.push(`${layerId}_label`);

				// layerIdNameDict[layerId] = layerEntry.name;
			} else if (layerEntry.type === 'geojson-point') {
				layerItems.push({
					id: layerId,
					type: 'circle',
					source: sourceId,
					paint: {
						'circle-opacity': layerEntry.opacity,
						...(layerEntry.style?.circle?.[0]?.paint ?? {})
					},
					layout: {
						...(layerEntry.style?.circle?.[0]?.layout ?? {})
					}
				});

				symbolLayerItems.push({
					id: `${layerId}_label`,
					type: 'symbol',
					source: sourceId,
					paint: {
						...(layerEntry.style?.symbol?.[0]?.paint ?? {})
					},
					layout: {
						...(layerEntry.style?.symbol?.[0]?.layout ?? {})
					}
				});
				excludeIds.push(`${layerId}_label`);
				// layerIdNameDict[layerId] = layerEntry.name;
			} else {
				console.warn(`Unknown layer type: ${layerEntry.type}`);
			}
		});
	excludeIds.push(...EXCLUDE_IDS_CLICK_LAYER);
	excludeIdsClickLayer.set(excludeIds);

	console.log('excludeIdsClickLayer', excludeIds);

	return [...layerItems, ...symbolLayerItems];
};
