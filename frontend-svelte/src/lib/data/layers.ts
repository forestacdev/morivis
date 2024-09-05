import { vectorPolygonEntries } from '$lib/data/vecter/polygon';
import { geojsonPolygonEntries } from '$lib/data/geojson/polygon';
import { geojsonLineEntries } from '$lib/data/geojson/line';
import { geojsonPointEntries } from '$lib/data/geojson/point';
import { geojsonLabelEntries } from '$lib/data/geojson/label';
import { addedLayerIds } from '$lib/store/store';
import { INT_ADD_LAYER_IDS } from '$lib/constants';

import { rasterEntries } from '$lib/data/raster';
import type { LayerEntry } from '$lib/data/types';
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
import { clickableLayerIds } from '$lib/store/store';

// export type BaseMapEntry = {
// 	type: 'raster';
// 	tiles: string[];
// 	minzoom: number;
// 	maxzoom: number;
// 	tileSize: number;
// 	attribution: string;
// };
// const tileUrl = `https://raw.githubusercontent.com/forestacdev/mino-terrain-rgb-poc/main/tiles/{z}/{x}/{y}.png`;
// export const backgroundSources: { [_: string]: BaseMapEntry } = {
// 	オルソ写真: {
// 		type: 'raster',
// 		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg'],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution:
// 			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
// 	},
// 	全国最新写真: {
// 		type: 'raster',
// 		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution:
// 			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
// 	},

// 	'空中写真（1979年頃）': {
// 		type: 'raster',
// 		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/gazo2/{z}/{x}/{y}.jpg'],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution:
// 			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
// 	},
// 	地理院標準地図: {
// 		type: 'raster',
// 		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution:
// 			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
// 	},
// 	地理院淡色地図: {
// 		type: 'raster',
// 		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution:
// 			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
// 	},
// 	地理院白地図: {
// 		type: 'raster',
// 		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/blank/{z}/{x}/{y}.png'],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution:
// 			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
// 	},
// 	色別標高図: {
// 		type: 'raster',
// 		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png'],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution:
// 			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
// 	},

// 	陰影起伏図: {
// 		type: 'raster',
// 		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png'],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution:
// 			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
// 	},
// 	傾斜量図白黒: {
// 		type: 'raster',
// 		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/slopemap/{z}/{x}/{y}.png'],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution:
// 			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
// 	},
// 	'傾斜区分図（岐阜県森林研究所）': {
// 		type: 'raster',
// 		tiles: [
// 			'https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/Gifu_2021Slpoe_2022_07_25_15_54/MapServer/tile/{z}/{y}/{x}'
// 		],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution:
// 			"<a href='https://www.forest.rd.pref.gifu.lg.jp/shiyou/CSrittaizu.html' target='_blank'>岐阜県森林研究所</a>"
// 	},
// 	植生図: {
// 		type: 'raster',
// 		tiles: ['https://map.ecoris.info/tiles/vege67hill/{z}/{x}/{y}.png'],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution:
// 			"<a href='https://map.ecoris.info/#contents' target='_blank'>エコリス地図タイル</a>"
// 	},
// 	シームレス地質図: {
// 		type: 'raster',
// 		tiles: ['https://gbank.gsj.jp/seamless/v2/api/1.2.1/tiles/{z}/{y}/{x}.png'],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution:
// 			"<a href='https://gbank.gsj.jp/seamless/index.html?lang=ja&' target='_blank'>産総研地質調査総合センター</a>"
// 	},
// 	活断層図: {
// 		type: 'raster',
// 		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/afm/{z}/{x}/{y}.png'],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution:
// 			"<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
// 	},
// 	'CS立体図（岐阜県）': {
// 		type: 'raster',
// 		tiles: [
// 			'https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/Gifu2021CS_Mosic/MapServer/tile/{z}/{y}/{x}'
// 		],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution:
// 			"<a href='https://www.forest.rd.pref.gifu.lg.jp/shiyou/CSrittaizu.html' target='_blank'>岐阜県森林研究所</a>"
// 	},
// 	岐阜県共有空間データ: {
// 		type: 'raster',
// 		tiles: ['https://mapdata.qchizu.xyz/gifu_pref_00/{z}/{x}/{y}.png'],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution:
// 			"<a href='https://info.qchizu.xyz/qchizu/reprint/' target='_blank'>Q地図タイル</a>"
// 	},
// 	赤色立体図10mメッシュ: {
// 		type: 'raster',
// 		tiles: ['https://cyberjapandata.gsi.go.jp/xyz/sekishoku/{z}/{x}/{y}.png'],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution: "<a href='https://www.rrim.jp/' target='_blank'>アジア航測株式会社</a>"
// 	},
// 	'Open Street Map': {
// 		type: 'raster',
// 		tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution: "&copy; <a href='http://osm.org/copyright'>OpenStreetMap</a> contributors"
// 	},
// 	'Esri World Street': {
// 		type: 'raster',
// 		tiles: [
// 			'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}.png'
// 		],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution: "&copy; <a href='http://osm.org/copyright'>ESRI</a> contributors"
// 	},
// 	'Esri World Imagery': {
// 		type: 'raster',
// 		tiles: [
// 			'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png'
// 		],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution: "&copy; <a href='http://osm.org/copyright'>ESRI</a> contributors"
// 	},
// 	'Esri World Topo': {
// 		type: 'raster',
// 		tiles: [
// 			'https://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}.png'
// 		],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution: "&copy; <a href='http://osm.org/copyright'>ESRI</a> contributors"
// 	},
// 	基本図: {
// 		type: 'raster',
// 		tiles: [
// 			'https://raw.githubusercontent.com/forestacdev/rastertile-poc/main/tiles/{z}/{x}/{y}.webp'
// 		],
// 		minzoom: 0,
// 		maxzoom: 19,
// 		tileSize: 256,
// 		attribution: '美濃市'
// 	}
// };

export const layerData: LayerEntry[] = [
	...geojsonLabelEntries,
	...geojsonPointEntries,
	...geojsonLineEntries,
	...geojsonPolygonEntries,
	...vectorPolygonEntries,
	...rasterEntries
];

// IDを収集
const validIds = [...new Set([...layerData.map((obj) => obj.id)])];

const validateId = (id: string) => {
	if (!validIds.includes(id)) {
		throw new Error(`Invalid ID: ${id}`);
	}
};

INT_ADD_LAYER_IDS.forEach((id) => {
	try {
		validateId(id); // ここでエラーが発生します
	} catch (error: any) {
		console.error(error.message); // "Invalid ID: 6"
	}
});

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
export const createHighlightLayer = (
	selectedhighlightData: SelectedHighlightData | null
): (FillLayerSpecification | LineLayerSpecification | CircleLayerSpecification)[] => {
	if (!selectedhighlightData) return [];

	const layerEntry = selectedhighlightData.LayerData;
	if (layerEntry.dataType === 'raster') return [];
	const layerId = 'HighlightFeatureId';
	const sourceId = `${layerEntry.id}_source`;

	const layers = [];

	switch (layerEntry.dataType) {
		case 'vector': {
			if (layerEntry.geometryType === 'polygon') {
				layers.push({
					id: layerId,
					type: 'fill',
					source: sourceId,
					'source-layer': layerEntry.sourceLayer,
					paint: {
						...highlightFillPaint
					},
					filter: ['==', ['get', layerEntry.idField], selectedhighlightData.featureId]
				} as FillLayerSpecification);
				layers.push({
					id: layerId + '_line',
					type: 'line',
					source: sourceId,
					'source-layer': layerEntry.sourceLayer,
					paint: {
						...highlightLinePaint
					},
					filter: ['==', ['get', layerEntry.idField], selectedhighlightData.featureId]
				} as LineLayerSpecification);
			} else if (layerEntry.geometryType === 'line') {
				layers.push({
					id: layerId,
					type: 'line',
					source: sourceId,
					'source-layer': layerEntry.sourceLayer,
					paint: {
						...highlightLinePaint
					},
					// filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
					filter: ['==', ['get', layerEntry.idField], selectedhighlightData.featureId]
				} as LineLayerSpecification);
			} else if (layerEntry.geometryType === 'point') {
				layers.push({
					id: layerId,
					type: 'circle',
					source: sourceId,
					'source-layer': layerEntry.sourceLayer,
					paint: {
						...highlightCirclePaint
					},
					filter: ['==', ['get', layerEntry.idField], selectedhighlightData.featureId]
				} as CircleLayerSpecification);
			}
			break;
		}
		case 'geojson': {
			if (layerEntry.geometryType === 'polygon') {
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
			} else if (layerEntry.geometryType === 'line') {
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
			} else if (layerEntry.geometryType === 'point') {
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
			}
			break;
		}
		default:
			break;
	}
	return layers;
};

// sourcesの作成
export const createSourceItems = (layerDataEntries: LayerEntry[]) => {
	const sourceItems: { [_: string]: SourceSpecification } = {};

	layerDataEntries.forEach((layerEntry) => {
		const sourceId = `${layerEntry.id}_source`;

		if (layerEntry.dataType === 'raster') {
			sourceItems[sourceId] = {
				type: 'raster',
				tiles: [layerEntry.url],
				maxzoom: layerEntry.sourceMaxZoom ? layerEntry.sourceMaxZoom : 24,
				minzoom: layerEntry.sourceMinZoom ? layerEntry.sourceMinZoom : 0,
				tileSize: 256,
				attribution: layerEntry.attribution
			};
		} else if (layerEntry.dataType === 'vector') {
			sourceItems[sourceId] = {
				type: 'vector',
				tiles: [layerEntry.url],
				maxzoom: layerEntry.sourceMaxZoom ? layerEntry.sourceMaxZoom : 24,
				minzoom: layerEntry.sourceMinZoom ? layerEntry.sourceMinZoom : 0,
				attribution: layerEntry.attribution,
				promoteId: layerEntry.idField ?? undefined
			};
		} else if (layerEntry.dataType === 'geojson') {
			sourceItems[sourceId] = {
				type: 'geojson',
				data: layerEntry.url,
				generateId: true,
				attribution: layerEntry.attribution
			};
		} else {
			console.warn(`Unknown layer: ${sourceId}`);
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
	const layerIds: string[] = []; // クリックイベントを有効にするレイヤーID

	// const layerIdNameDict: { [_: string]: string } = {};

	layerDataEntries
		.filter((layerEntry) => layerEntry.visible)
		.reverse()
		.forEach((layerEntry) => {
			const layerId = `${layerEntry.id}`;
			const sourceId = `${layerEntry.id}_source`;
			if (layerEntry.clickable) layerIds.push(layerId);
			const layer = {
				id: layerId,
				source: sourceId,
				maxzoom: layerEntry.layerMaxZoom ?? 24,
				minzoom: layerEntry.layerMinZoom ?? 0
			};

			switch (layerEntry.dataType) {
				// ラスターレイヤー
				case 'raster': {
					layerItems.push({
						...layer,
						type: 'raster',
						paint: {
							'raster-opacity': layerEntry.opacity,
							...(layerEntry.style?.raster?.[0]?.paint ?? {})
						}
					});
					break;
				}
				// ベクトルタイル ポリゴンレイヤー
				case 'vector':
				case 'geojson': {
					const styleKey = layerEntry.styleKey;

					if (layerEntry.filter) layer.filter = layerEntry.filter as FilterSpecification;
					if (layerEntry.dataType === 'vector') {
						layer['source-layer'] = layerEntry.sourceLayer;
					}
					if (layerEntry.geometryType === 'polygon') {
						const fillStyele = layerEntry.style?.fill?.find(
							(item) => item.name === styleKey
						);
						const fillLayer = {
							...layer,
							type: 'fill',
							paint: {
								'fill-opacity': layerEntry.showFill ? layerEntry.opacity : 0,
								'fill-outline-color': '#00000000',
								...(fillStyele?.paint ?? {})
							},
							layout: {
								...(fillStyele?.layout ?? {})
							}
						};

						layerItems.push(fillLayer as FillLayerSpecification);

						// アウトラインを追加
						if (layerEntry.showLine) {
							const styleIndex = layerEntry.style?.line?.findIndex(
								(item) => item.name === styleKey
							) as number;

							layerItems.push({
								...layer,
								id: `${layerId}_outline`,
								type: 'line',
								paint: {
									'line-opacity': layerEntry.opacity,
									...(styleIndex !== -1
										? layerEntry.style?.line?.[styleIndex]?.paint
										: layerEntry.style?.line?.[0]?.paint)
								},
								layout: {
									...(styleIndex !== -1
										? layerEntry.style?.line?.[styleIndex]?.layout
										: layerEntry.style?.line?.[0]?.layout)
								}
							});
						}
					} else if (layerEntry.geometryType === 'line') {
						const setStyele = layerEntry.style?.line?.find(
							(item) => item.name === styleKey
						);
						const lineLayer = {
							...layer,
							type: 'line',
							paint: {
								'line-opacity': layerEntry.opacity,
								...(setStyele?.paint ?? {})
							},
							layout: {
								...(setStyele?.layout ?? {})
							}
						};

						layerItems.push(lineLayer as LineLayerSpecification);
					} else if (layerEntry.geometryType === 'point') {
						const setStyele = layerEntry.style?.circle?.find(
							(item) => item.name === styleKey
						);
						const pointLayer = {
							...layer,
							type: 'circle',
							paint: {
								'circle-opacity': layerEntry.opacity,
								...(setStyele?.paint ?? {})
							},
							layout: {
								...(setStyele?.layout ?? {})
							}
						};

						layerItems.push(pointLayer as CircleLayerSpecification);
					} else if (layerEntry.geometryType === 'label') {
						const setStyele = layerEntry.style?.label?.find(
							(item) => item.name === styleKey
						);
						const pointLayer = {
							...layer,
							type: 'symbol',
							paint: {
								'text-opacity': layerEntry.opacity,
								'icon-opacity': layerEntry.opacity,
								...(setStyele?.paint ?? {})
							},
							layout: {
								...(setStyele?.layout ?? {})
							}
						};

						layerItems.push(pointLayer as SymbolLayerSpecification);
					}

					// ラベルを追加
					if (layerEntry.showLabel && layerEntry.geometryType !== 'label') {
						symbolLayerItems.push({
							...layer,
							id: `${layerId}_label`,
							type: 'symbol',
							paint: {
								'text-opacity': layerEntry.opacity,
								'icon-opacity': layerEntry.opacity,
								...(layerEntry.style?.symbol?.[0]?.paint ?? {})
							},
							layout: {
								...(layerEntry.style?.symbol?.[0]?.layout ?? {})
							}
						});
					}

					break;
				}

				default:
					console.warn(`Unknown layer: ${layerEntry}`);
					break;
			}
		});

	clickableLayerIds.set(layerIds);
	const highlightLayers = selectedhighlightData
		? createHighlightLayer(selectedhighlightData)
		: [];

	return [...layerItems, ...highlightLayers, ...symbolLayerItems];
};
