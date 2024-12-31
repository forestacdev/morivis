import { INT_ADD_LAYER_IDS } from '$routes/map/constants';

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
import {
	GEOJSON_BASE_PATH,
	EXCLUDE_IDS_CLICK_LAYER,
	GIFU_DATA_BASE_PATH
} from '$routes/map/constants';
import { clickableLayerIds } from '$map/store';
import { geoDataEntry } from '$map/data';
import type { GeoDataEntry } from '$map/data';
import type { LayerEntry } from '../data/types';

// IDを収集
const validIds = [...new Set(Object.keys(geoDataEntry))];
const validateId = (id: string) => {
	if (!validIds.includes(id)) {
		throw new Error(`Invalid ID: ${id}`);
	}
};
INT_ADD_LAYER_IDS.forEach((id) => {
	try {
		validateId(id); // ここでエラーが発生します
	} catch (error: Error) {
		console.error(error.message);
		alert('無効なidです: ${id}');
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
			type BaseLayer = {
				source: string;
				'source-layer': string;
				filter?: FilterSpecification;
			};
			const baseLayer: BaseLayer = {
				source: sourceId,
				'source-layer': layerEntry.sourceLayer
			};

			if (layerEntry.idField) {
				baseLayer.filter = ['==', ['get', layerEntry.idField], selectedhighlightData.featureId];
			}
			// filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
			if (layerEntry.geometryType === 'polygon') {
				layers.push({
					id: layerId,
					type: 'fill',
					...baseLayer,
					paint: {
						...highlightFillPaint
					}
				} as FillLayerSpecification);
				layers.push({
					id: layerId + '_line',
					type: 'line',

					paint: {
						...highlightLinePaint
					}
				} as LineLayerSpecification);
			} else if (layerEntry.geometryType === 'line') {
				layers.push({
					id: layerId,
					type: 'line',
					...baseLayer,
					paint: {
						...highlightLinePaint
					}
				} as LineLayerSpecification);
			} else if (layerEntry.geometryType === 'point') {
				layers.push({
					id: layerId,
					type: 'circle',
					...baseLayer,
					paint: {
						...highlightCirclePaint
					}
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

// fillレイヤーの作成
const createFillLayer = (layer, layerId, layerEntry, fillStyle, fillStyleKey) => {
	const fillColor = fillStyle.color[fillStyleKey] ?? fillStyle.color['デフォルト'];
	const color = createColorExpression(fillColor);

	return {
		...layer,
		type: 'fill',
		paint: {
			...(fillStyle.paint ?? {}),
			'fill-opacity': fillStyle.show ? layerEntry.opacity : 0,
			'fill-outline-color': '#00000000',
			'fill-color': color
		},
		layout: {
			...(fillStyle.layout ?? {})
		}
	};
};

// lineレイヤーの作成
const createLineLayer = (layer, layerId, layerEntry, lineStyle, lineStyleKey) => {
	const lineColor = lineStyle.color[lineStyleKey] ?? lineStyle.color['デフォルト'];
	const color = createColorExpression(lineColor);
	const lineWidth = lineStyle.lineWidth.values[lineStyle.lineWidth.type] ?? 2;

	return {
		...layer,
		id: `${layerId}_outline`,
		type: 'line',
		paint: {
			...(lineStyle.paint ?? {}),
			'line-opacity': layerEntry.opacity,
			'line-color': color,
			'line-width': lineWidth,
			...(lineStyle.linePattern === 'dashed' ? { 'line-dasharray': [2, 2] } : {})
		},
		layout: {
			...(lineStyle?.layout ?? {})
		}
	};
};

// pointレイヤーの作成
const createCircleLayer = (layer, layerId, layerEntry, circleStyle, circleStyleKey) => {
	const circleColor = circleStyle.color[circleStyleKey] ?? circleStyle.color['デフォルト'];
	const color = createColorExpression(circleColor);
	const circleRadius = circleStyle.circleRadius.values[circleStyle.circleRadius.type] ?? 5;
	const circleStrokeColor =
		circleStyle.strokeColor.values[circleStyle.strokeColor.type] ?? '#ffffff';
	const circleStrokeWidth = circleStyle.strokeWidth.values[circleStyle.strokeWidth.type] ?? 1;
	return {
		...layer,
		type: 'circle',
		paint: {
			...(circleStyle.paint ?? {}),
			'circle-opacity': layerEntry.opacity,
			'circle-stroke-opacity': layerEntry.opacity,
			'circle-color': color,
			'circle-radius': circleRadius,
			'circle-stroke-color': circleStrokeColor,
			'circle-stroke-width': circleStrokeWidth
		},
		layout: {
			...(circleStyle.layout ?? {})
		}
	};
};

// symbolレイヤーの作成
const createSymbolLayer = (layer, layerId, layerEntry, symbolStyle, symbolStyleKey) => {
	const symbolColor = symbolStyle.color[symbolStyleKey] ?? symbolStyle.color['デフォルト'];
	const color = createColorExpression(symbolColor);
	return {
		...layer,
		id: `${layerId}_label`,
		type: 'symbol',
		paint: {
			...(symbolStyle.paint ?? {}),
			'text-opacity': 1.0,
			'icon-opacity': 1.0,
			'text-color': color
		},
		layout: {
			...(symbolStyle.layout ?? {})
		}
	};
};

// layersの作成
export const createLayersItems = (_dataEntries: GeoDataEntry) => {

	const layerItems: LayerSpecification[] = [];
	const symbolLayerItems: LayerSpecification[] = [];
	const pointItems: LayerSpecification[] = [];
	const lineItems: LayerSpecification[] = [];
	const layerIds: string[] = []; // クリックイベントを有効にするレイヤーID

	// const layerIdNameDict: { [_: string]: string } = {};

	Object.entries(_dataEntries)
		.filter((dataEntry) => dataEntry.visible)
		.reverse()
		.forEach((layerEntry) => {
			const layerId = `${layerEntry.id}`;
			const sourceId = `${layerEntry.id}_source`;
			if (layerEntry.clickable) layerIds.push(layerId);

			type Layer = {
				id: string;
				source: string;
				maxzoom: number;
				minzoom: number;
				type?: string;
				paint?:
					| FillLayerSpecification['paint']
					| LineLayerSpecification['paint']
					| CircleLayerSpecification['paint']
					| SymbolLayerSpecification['paint'];
				layout?:
					| FillLayerSpecification['layout']
					| LineLayerSpecification['layout']
					| CircleLayerSpecification['layout']
					| SymbolLayerSpecification['layout'];
				'source-layer'?: string;
				filter?: FilterSpecification;
			};
			const layer: Layer = {
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
					if (layerEntry.filter) layer.filter = layerEntry.filter as FilterSpecification;
					if (layerEntry.dataType === 'vector') {
						layer['source-layer'] = layerEntry.sourceLayer;
					}
					const fillStyle = layerEntry.style?.fill;
					const lineStyle = layerEntry.style?.line;
					const circleStyle = layerEntry.style?.circle;
					const symbolStyle = layerEntry.style?.symbol;

					const fillStyleKey = fillStyle?.styleKey;
					const lineStyleKey = lineStyle?.styleKey;
					const circleStyleKey = circleStyle?.styleKey;
					const symbolStyleKey = symbolStyle?.styleKey;
					if (layerEntry.geometryType === 'polygon' && fillStyle && fillStyleKey) {
						const fillLayer = createFillLayer(layer, layerId, layerEntry, fillStyle, fillStyleKey);

						layerItems.push(fillLayer as FillLayerSpecification);

						// アウトラインを追加
						if (lineStyle && lineStyleKey && lineStyle.show) {
							const lineLayer = createLineLayer(
								layer,
								layerId,
								layerEntry,
								lineStyle,
								lineStyleKey
							);
							layerItems.push(lineLayer as LineLayerSpecification);
						}

						// ラベルを追加
						if (symbolStyle && symbolStyleKey && symbolStyle.show) {
							const symbolLayer = createSymbolLayer(
								layer,
								layerId,
								layerEntry,
								symbolStyle,
								symbolStyleKey
							);
							symbolLayerItems.push(symbolLayer as SymbolLayerSpecification);
						}
					} else if (layerEntry.geometryType === 'line' && lineStyle && lineStyleKey) {
						const lineLayer = createLineLayer(layer, layerId, layerEntry, lineStyle, lineStyleKey);

						layerItems.push(lineLayer as LineLayerSpecification);
					} else if (layerEntry.geometryType === 'point') {
						const pointLayer = createCircleLayer(
							layer,
							layerId,
							layerEntry,
							circleStyle,
							circleStyleKey
						);
						layerItems.push(pointLayer as CircleLayerSpecification);
					} else if (layerEntry.geometryType === 'label') {
						const setStyele = layerEntry.style?.symbol?.find((item) => item.name === styleKey);
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
					if (layerEntry.showSymbol && layerEntry.geometryType !== 'label') {
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
	const highlightLayers = selectedhighlightData ? createHighlightLayer(selectedhighlightData) : [];

	return [...layerItems, ...highlightLayers, ...symbolLayerItems];
};
