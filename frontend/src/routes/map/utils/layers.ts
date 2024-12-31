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
import type { VectorStyle } from '$map/data/vector/style';
import type { GeoDataEntry } from '$map/data';
import type { PointStyle, PolygonStyle, LineStringStyle, LabelStyle } from '$map/data/vector/style';

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
const createFillLayer = (layer: LayerItem, style: VectorStyle): FillLayerSpecification => {
	const fillStyle = (style.default as PolygonStyle).fill;
	const fillLayer: FillLayerSpecification = {
		...layer,
		type: 'fill',
		paint: {
			...(fillStyle.paint ?? {}),
			'fill-opacity': style.opacity,
			// 'fill-outline-color': '#00000000',
			'fill-color': style.color
		},
		layout: {
			...(fillStyle.layout ?? {})
		}
	};

	// TODO fill-outline-color
	return fillLayer;
};

// lineレイヤーの作成
const createLineLayer = (layer: LayerItem, style: VectorStyle): LineLayerSpecification => {
	const lineStyle = (style.default as LineStringStyle).line;
	const lineLayer: LineLayerSpecification = {
		...layer,
		type: 'line',
		paint: {
			...(lineStyle.paint ?? {}),
			'line-opacity': style.opacity,
			'line-color': style.color,
			'line-width': 2
		},
		layout: {
			...(lineStyle?.layout ?? {})
		}
	};

	// TODO width line-dasharray
	return lineLayer;
};

// pointレイヤーの作成
const createCircleLayer = (layer: LayerItem, style: VectorStyle): CircleLayerSpecification => {
	const circleStyle = (style.default as PointStyle).circle;
	const circleLayer: CircleLayerSpecification = {
		...layer,
		type: 'circle',
		paint: {
			...(circleStyle.paint ?? {}),
			'circle-opacity': style.opacity,
			'circle-stroke-opacity': style.opacity,
			'circle-color': style.color,
			'circle-radius': 6,
			'circle-stroke-color': '#ffffff',
			'circle-stroke-width': 2
		},
		layout: {
			...(circleStyle.layout ?? {})
		}
	};

	// TODO circle-radius circle-stroke-color circle-stroke-width
	return circleLayer;
};

// symbolレイヤーの作成
const createSymbolLayer = (layer: LayerItem, style: VectorStyle): SymbolLayerSpecification => {
	const symbolStyle = (style.default as LabelStyle).symbol;
	const symbolLayer: SymbolLayerSpecification = {
		...layer,
		id: `${layer.id}_label`,
		type: 'symbol',
		paint: {
			...(symbolStyle.paint ?? {}),
			'text-opacity': 1,
			'icon-opacity': 1,
			'text-color': '#000000',
			'text-halo-color': '#FFFFFF',
			'text-halo-width': 2
		},
		layout: {
			...(symbolStyle.layout ?? {}),
			// visibility: 'visible',
			'text-field': style.labels[0].value,
			'text-size': 12,
			'text-max-width': 12

			// "text-variable-anchor": ["top", "bottom", "left", "right"],
			// "text-radial-offset": 0.5,
			// "text-justify": "auto",
		}
	};

	// TODO: text-halo-color text-halo-width text-size
	return symbolLayer;
};

type LayerItem = {
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

// layersの作成
export const createLayersItems = (_dataEntries: GeoDataEntry) => {
	const layerItems: LayerSpecification[] = [];
	const symbolLayerItems: LayerSpecification[] = [];
	const pointItems: LayerSpecification[] = [];
	const lineItems: LayerSpecification[] = [];
	const layerIds: string[] = []; // クリックイベントを有効にするレイヤーID

	// const layerIdNameDict: { [_: string]: string } = {};

	Object.entries(_dataEntries)
		.filter(([_, dataEntry]) => dataEntry.style.visible)
		.reverse()
		.forEach(([id, dataEntry]) => {
			const layerId = `${id}`;
			const sourceId = `${id}_source`;
			const { format, style, metaData, properties, interaction, type } = dataEntry;
			if (interaction.clickable) layerIds.push(layerId);

			const layer: LayerItem = {
				id: layerId,
				source: sourceId,
				maxzoom: 24,
				minzoom: 0
			};

			switch (type) {
				// ラスターレイヤー
				case 'raster': {
					// layerItems.push({
					// 	...layer,
					// 	type: 'raster',
					// 	paint: {
					// 		'raster-opacity': layerEntry.opacity,
					// 		...(layerEntry.style?.raster?.[0]?.paint ?? {})
					// 	}
					// });
					break;
				}
				// ベクターレイヤー
				case 'vector': {
					if (format.type === 'mvt') {
						// TODO: source-layer
						// layer['source-layer'] = metaData.sourceLayer;
					}

					switch (style.type) {
						case 'fill': {
							const fillLayer = createFillLayer(layer, style);
							layerItems.push(fillLayer);
							break;
						}
						case 'line': {
							const lineLayer = createLineLayer(layer, style);
							layerItems.push(lineLayer);
							break;
						}
						case 'circle': {
							const circleLayer = createCircleLayer(layer, style);
							layerItems.push(circleLayer);
							break;
						}
						case 'symbol': {
							const symbolLayer = createSymbolLayer(layer, style);
							symbolLayerItems.push(symbolLayer);
							break;
						}
					}

					// ラベルを追加
					if (style.displayLabel && style.type !== 'symbol') {
						const symbolLayer = createSymbolLayer(layer, style);
						symbolLayerItems.push(symbolLayer);
					}

					break;
				}

				default:
					console.warn(`Unknown layer: ${id}`);
					break;
			}
		});

	clickableLayerIds.set(layerIds);
	// const highlightLayers = selectedhighlightData ? createHighlightLayer(selectedhighlightData) : [];

	return [...layerItems, ...symbolLayerItems];
};
