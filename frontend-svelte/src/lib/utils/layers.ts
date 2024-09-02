import { labelEntries } from '$lib/data/vecter/label';
import { lineEntries } from '$lib/data/vecter/line';
import { pointEntries } from '$lib/data/vecter/point';
import { polygonEntries } from '$lib/data/vecter/polygon';

import { rasterEntries } from '$lib/data/raster';
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
	BackgroundLayerSpecification,
	FilterSpecification
} from 'maplibre-gl';
import { GEOJSON_BASE_PATH, EXCLUDE_IDS_CLICK_LAYER, GIFU_DATA_BASE_PATH } from '$lib/constants';
import { excludeIdsClickLayer } from '$lib/store/store';

export type BaseMapEntry = {
	type: 'raster';
	tiles: string[];
	minzoom: number;
	maxzoom: number;
	tileSize: number;
	attribution: string;
};
const tileUrl = `https://raw.githubusercontent.com/forestacdev/mino-terrain-rgb-poc/main/tiles/{z}/{x}/{y}.png`;
export const backgroundSources: { [_: string]: BaseMapEntry } = {
	オルソ写真: {
		type: 'raster',
		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg'],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution:
			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
	},
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
	},
	'Esri World Topo': {
		type: 'raster',
		tiles: [
			'https://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}.png'
		],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution: "&copy; <a href='http://osm.org/copyright'>ESRI</a> contributors"
	},
	基本図: {
		type: 'raster',
		tiles: [
			'https://raw.githubusercontent.com/forestacdev/rastertile-poc/main/tiles/{z}/{x}/{y}.webp'
		],
		minzoom: 0,
		maxzoom: 19,
		tileSize: 256,
		attribution: '美濃市'
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
	layer_minzoom?: number;
	layer_maxzoom?: number;
	source_minzoom?: number;
	source_maxzoom?: number;
	source_layer?: string;
	opacity: number;
	style_key: string;
	style?: LayerStyle;
	filter?: FilterSpecification;
	visible: boolean;
	show_label?: boolean;
	show_outline?: boolean;
	show_fill?: boolean;
	id_field?: string; // フィーチャーのIDとして使用するフィールド名
	prop_dict?: string; // プロパティの辞書ファイルのURL
	clickable?: boolean; // クリック可能かどうか
	searchKeys?: string[]; // 検索対象のプロパティ名
	remarks?: string; // 備考
};

const rasterPaint = {
	'raster-saturation': 0,
	'raster-hue-rotate': 0,
	'raster-brightness-min': 0,
	'raster-brightness-max': 1,
	'raster-contrast': 0
};

export const layerData: LayerEntry[] = [
	...rasterEntries,
	...polygonEntries,
	...lineEntries,
	...pointEntries,
	...labelEntries
];

const highlightFillPaint: FillLayerSpecification['paint'] = {
	'fill-opacity': 0.4,
	'fill-color': '#00d5ff'
};

const highlightLinePaint: LineLayerSpecification['paint'] = {
	'line-color': '#ffffff',
	'line-opacity': 1,
	'line-width': 5
};

const highlightCirclePaint: CircleLayerSpecification['paint'] = {
	'circle-color': '#00d5ff',
	'circle-radius': 10,
	'circle-stroke-width': 5,
	'circle-stroke-color': '#ffffff'
};

const highlightSymbolPaint: SymbolLayerSpecification['paint'] = {
	'text-color': '#c50000',
	'text-halo-color': '#FFFFFF',
	'text-halo-width': 10,
	'text-opacity': 1
};

export type SelectedHighlightData = {
	LayerData: LayerEntry;
	featureId: string;
};

/* ハイライトレイヤー */
export const createHighlightLayer = (selectedhighlightData: SelectedHighlightData | null) => {
	if (!selectedhighlightData) return [];

	const layerEntry = selectedhighlightData.LayerData;

	const layerId = 'HighlightFeatureId';
	const sourceId = `${layerEntry.id}_source`;

	const layers = [];

	if (layerEntry.type === 'vector-polygon') {
		layers.push({
			id: layerId,
			type: 'fill',
			source: sourceId,
			'source-layer': layerEntry.source_layer,
			paint: {
				...highlightFillPaint
			},
			filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
		} as FillLayerSpecification);
		layers.push({
			id: layerId + '_line',
			type: 'line',
			source: sourceId,
			'source-layer': layerEntry.source_layer,
			paint: {
				...highlightLinePaint
			},
			filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
		} as LineLayerSpecification);
	} else if (layerEntry.type === 'vector-line') {
		layers.push({
			id: layerId,
			type: 'line',
			source: sourceId,
			'source-layer': layerEntry.source_layer,
			paint: {
				...highlightLinePaint
			},
			// filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
			filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
		} as LineLayerSpecification);
	} else if (layerEntry.type === 'vector-point') {
		layers.push({
			id: layerId,
			type: 'circle',
			source: sourceId,
			'source-layer': layerEntry.source_layer,
			paint: {
				...highlightCirclePaint
			},
			filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
		} as CircleLayerSpecification);
	} else if (layerEntry.type === 'geojson-polygon') {
		layers.push({
			id: layerId,
			type: 'fill',
			source: sourceId,
			paint: {
				...highlightFillPaint
			},
			// filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
			filter: ['==', ['id'], selectedhighlightData.featureId]
		} as FillLayerSpecification);

		layers.push({
			id: layerId + '_line',
			type: 'line',
			source: sourceId,
			paint: {
				...highlightLinePaint
			},
			// filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
			filter: ['==', ['id'], selectedhighlightData.featureId]
		} as LineLayerSpecification);
	} else if (layerEntry.type === 'geojson-line') {
		layers.push({
			id: layerId,
			type: 'line',
			source: sourceId,
			paint: {
				...highlightLinePaint
			},
			// filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
			filter: ['==', ['id'], selectedhighlightData.featureId]
		} as LineLayerSpecification);
	} else if (layerEntry.type === 'geojson-point') {
		layers.push({
			id: layerId,
			type: 'circle',
			source: sourceId,
			paint: {
				...highlightCirclePaint
			},
			// filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
			filter: ['==', ['id'], selectedhighlightData.featureId]
		} as CircleLayerSpecification);
	} else if (layerEntry.type === 'geojson-label') {
		// TODO シンボルレイヤーのハイライト処理
		// const paint = layerEntry.style?.symbol?[layerEntry?.style_key]?.paint
		// const styleKey = layerEntry.style_key;
		// const paint = layerEntry.style?.symbol?.find((item) => item.name === styleKey)?.paint ?? {};
		// const layout =
		// 	layerEntry.style?.symbol?.find((item) => item.name === styleKey)?.layout ?? {};
		// if (styleKey) {
		// 	layers.push({
		// 		id: layerId,
		// 		type: 'symbol',
		// 		source: sourceId,
		// 		paint: {
		// 			...paint,
		// 			...highlightSymbolPaint
		// 		},
		// 		// layout: {
		// 		// 	...layout,
		// 		// 	'icon-image': undefined
		// 		// },
		// 		// filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
		// 		filter: ['==', ['id'], selectedhighlightData.featureId]
		// 	} as SymbolLayerSpecification);
		// }
	} else {
		console.warn(`Unknown layer type: ${layerEntry.type}`);
		return [];
	}

	return layers;
};

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
			layerEntry.type === 'vector-point' ||
			layerEntry.type === 'vector-label'
		) {
			sourceItems[sourceId] = {
				type: 'vector',
				tiles: [layerEntry.path],
				maxzoom: layerEntry.maxzoom ? layerEntry.maxzoom : 24,
				minzoom: layerEntry.minzoom ? layerEntry.minzoom : 0,
				attribution: layerEntry.attribution,
				promoteId: layerEntry.id_field ?? undefined
			};
		} else if (
			layerEntry.type === 'geojson-polygon' ||
			layerEntry.type === 'geojson-line' ||
			layerEntry.type === 'geojson-point' ||
			layerEntry.type === 'geojson-label'
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
export const createLayerItems = (
	layerDataEntries: LayerEntry[],
	selectedhighlightData: SelectedHighlightData | null
) => {
	const layerItems: LayerSpecification[] = [];
	const symbolLayerItems: LayerSpecification[] = [];
	const pointItems: LayerSpecification[] = [];
	const lineItems: LayerSpecification[] = [];
	const excludeIds: string[] = []; // クリックイベントを除外するレイヤーID

	// const layerIdNameDict: { [_: string]: string } = {};

	layerDataEntries
		.filter((layerEntry) => layerEntry.visible)
		.reverse()
		.forEach((layerEntry, i) => {
			const layerId = `${layerEntry.id}`;
			const sourceId = `${layerEntry.id}_source`;

			switch (layerEntry.type) {
				// ラスターレイヤー
				case 'raster': {
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
					break;
				}
				// ベクトルタイル ポリゴンレイヤー
				case 'vector-polygon': {
					const styleKey = layerEntry.style_key;
					const setStyele = layerEntry.style?.fill?.find(
						(item) => item.name === styleKey
					);
					const layer = {
						id: layerId,
						type: 'fill',
						source: sourceId,
						'source-layer': layerEntry.source_layer,
						maxzoom: 24,
						minzoom: 0,
						paint: {
							'fill-opacity': layerEntry.show_fill ? layerEntry.opacity : 0,
							'fill-outline-color': '#00000000',
							...setStyele?.paint
						},
						layout: {
							...(setStyele?.layout ?? {})
						}
					} as LayerSpecification;

					layerItems.push(layer);

					// アウトラインを追加
					if (layerEntry.show_outline) {
						const index = layerEntry.style?.line?.findIndex(
							(item) => item.name === styleKey
						) as number;

						layerItems.push({
							id: `${layerId}_outline`,
							type: 'line',
							source: sourceId,
							'source-layer': layerEntry.source_layer,
							paint: {
								'line-opacity': layerEntry.opacity,
								...(index !== -1
									? layerEntry.style?.line?.[index]?.paint
									: layerEntry.style?.line?.[0]?.paint)
							},
							layout: {
								...(index !== -1
									? layerEntry.style?.line?.[index]?.layout
									: layerEntry.style?.line?.[0]?.layout)
							}
						});

						excludeIds.push(`${layerId}_outline`);
					}

					// ラベルを追加
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
					break;
				}
				// ベクトルタイル ラインレイヤー
				case 'vector-line': {
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
					break;
				}
				// ベクトルタイル ポイントレイヤー
				case 'vector-point': {
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
					break;
				}

				// GeoJSON ポリゴンレイヤー
				case 'geojson-polygon': {
					const styleKey = layerEntry.style_key;
					const setStyele = layerEntry.style?.fill?.find(
						(item) => item.name === styleKey
					);

					const layer = {
						id: layerId,
						type: 'fill',
						source: sourceId,
						paint: {
							'fill-opacity': layerEntry.show_fill ? layerEntry.opacity : 0,
							'fill-outline-color': '#00000000',
							...setStyele?.paint
						},
						layout: {
							...(setStyele?.layout ?? {})
						}
						// filter: ['==', ['id'], 1]
					} as FillLayerSpecification;

					if (layerEntry.filter) layer.filter = layerEntry.filter;

					layerItems.push(layer);
					// layerIdNameDict[layerId] = layerEntry.name;
					const index = layerEntry.style?.line?.findIndex(
						(item) => item.name === styleKey
					) as number;

					if (layerEntry.show_outline) {
						const outlineLayer = {
							id: `${layerId}_outline`,
							type: 'line',
							source: sourceId,
							paint: {
								'line-opacity': layerEntry.opacity,
								...(index !== -1
									? layerEntry.style?.line?.[index]?.paint
									: layerEntry.style?.line?.[0]?.paint)
							},
							layout: {
								...(index !== -1
									? layerEntry.style?.line?.[index]?.layout
									: layerEntry.style?.line?.[0]?.layout)
							}
						} as LineLayerSpecification;

						if (layerEntry.filter) outlineLayer.filter = layerEntry.filter;

						layerItems.push(outlineLayer);
						excludeIds.push(`${layerId}_outline`);
					}
					if (layerEntry.show_label) {
						const symbolLayer = {
							id: `${layerId}_label`,
							type: 'symbol',
							source: sourceId,
							paint: {
								...(layerEntry.style?.symbol?.[0]?.paint ?? {})
							},
							layout: {
								...(layerEntry.style?.symbol?.[0]?.layout ?? {})
							}
						} as SymbolLayerSpecification;

						if (layerEntry.filter) symbolLayer.filter = layerEntry.filter;
						symbolLayerItems.push(symbolLayer);
						excludeIds.push(`${layerId}_label`);
					}
					break;
				}
				// GeoJSON ラインレイヤー
				case 'geojson-line': {
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

					break;
				}
				// GeoJSON ポイントレイヤー
				case 'geojson-point': {
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
					break;
				}
				// GeoJSON ラベルレイヤー
				case 'geojson-label': {
					symbolLayerItems.push({
						id: layerId,
						type: 'symbol',
						source: sourceId,
						paint: {
							'text-opacity': layerEntry.opacity,
							'icon-opacity': layerEntry.opacity,
							...(layerEntry.style?.symbol?.[0]?.paint ?? {})
						},
						layout: {
							...(layerEntry.style?.symbol?.[0]?.layout ?? {})
						}
					});

					break;
				}

				default:
					console.warn(`Unknown layer type: ${layerEntry.type}`);
					break;
			}
		});
	excludeIds.push(...EXCLUDE_IDS_CLICK_LAYER);
	excludeIdsClickLayer.set(excludeIds);
	const highlightLayers = selectedhighlightData
		? createHighlightLayer(selectedhighlightData)
		: [];

	console.log('excludeIdsClickLayer', excludeIds);

	return [...layerItems, ...highlightLayers, ...symbolLayerItems];
};
