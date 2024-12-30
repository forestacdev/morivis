import { vectorPolygonEntries } from '$routes/map/data/vecter/polygon';
import { geojsonPolygonEntries } from '$routes/map/data/geojson/polygon';
import { geojsonLineEntries } from '$routes/map/data/geojson/line';
import { geojsonPointEntries } from '$routes/map/data/geojson/point';
import { geojsonLabelEntries } from '$routes/map/data/geojson/label';
import { addedLayerIds } from '$routes/map/store/store';
import { INT_ADD_LAYER_IDS } from '$routes/map/constants';
import { demLayers } from '$routes/map/data/raster/dem';

import { createColorExpression } from '$routes/map/data/expression';

import { rasterEntries } from '$routes/map/data/raster';
import { demEntry } from '$routes/map/data/raster/dem';
import type { LayerEntry } from '$routes/map/data/types';
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
import { clickableLayerIds } from '$routes/map/store/store';

export const layerData: LayerEntry[] = [
	...geojsonLabelEntries,
	...geojsonPointEntries,
	...geojsonLineEntries,
	...geojsonPolygonEntries,
	...vectorPolygonEntries,
	...rasterEntries,
	demEntry
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
				baseLayer.filter = [
					'==',
					['get', layerEntry.idField],
					selectedhighlightData.featureId
				];
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

// sourcesの作成
export const createSourceItems = (layerDataEntries: LayerEntry[]) => {
	const sourceItems: { [_: string]: SourceSpecification } = {};

	layerDataEntries.forEach((layerEntry) => {
		const sourceId = `${layerEntry.id}_source`;

		if (layerEntry.dataType === 'raster') {
			if (layerEntry.geometryType === 'raster') {
				sourceItems[sourceId] = {
					type: 'raster',
					tiles: [layerEntry.url],
					maxzoom: layerEntry.sourceMaxZoom ? layerEntry.sourceMaxZoom : 24,
					minzoom: layerEntry.sourceMinZoom ? layerEntry.sourceMinZoom : 0,
					tileSize: 256,
					attribution: layerEntry.attribution,
					bounds: layerEntry.bbox ?? [-180, -85.051129, 180, 85.051129]
				};
			} else if (layerEntry.geometryType === 'dem') {
				const demData = demLayers.find((layer) => layer.id === layerEntry.tileId);
				if (!demData) {
					console.warn(`Unknown: ${layerEntry.tileId}`);
					return;
				}
				demEntry.name = demData.name;
				demEntry.url = demData.tiles[0];
				demEntry.demType = demData.demType;
				demEntry.sourceMaxZoom = demData.maxzoom;
				demEntry.sourceMinZoom = demData.minzoom;
				demEntry.attribution = demData.attribution;
				demEntry.location = demData.location;
				demEntry.bbox = demData.bbox ?? [-180, -85.051129, 180, 85.051129];
				demEntry.tileId = demData.id;

				sourceItems[sourceId] = {
					type: 'raster',
					tiles: [`${layerEntry.protocolKey}://${demData.tiles[0]}`],
					maxzoom: demData.maxzoom ? demData.maxzoom : 24,
					minzoom: demData.minzoom ? demData.minzoom : 0,
					tileSize: 256,
					attribution: demData.attribution,
					bounds: demData.bbox ?? [-180, -85.051129, 180, 85.051129]
				};
			}
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
						const fillLayer = createFillLayer(
							layer,
							layerId,
							layerEntry,
							fillStyle,
							fillStyleKey
						);

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
						const lineLayer = createLineLayer(
							layer,
							layerId,
							layerEntry,
							lineStyle,
							lineStyleKey
						);

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
						const setStyele = layerEntry.style?.symbol?.find(
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
	const highlightLayers = selectedhighlightData
		? createHighlightLayer(selectedhighlightData)
		: [];

	return [...layerItems, ...highlightLayers, ...symbolLayerItems];
};
