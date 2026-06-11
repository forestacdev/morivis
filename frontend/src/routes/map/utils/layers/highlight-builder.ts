import { HIGHLIGHT_LAYER_COLOR } from '$routes/constants';
import type { GeoDataEntry } from '$routes/map/data/types';
import type { FieldDef } from '$routes/map/data/types/vector/properties';
import type { VectorProperties } from '$routes/map/data/types/vector/properties';
import type { VectorStyle } from '$routes/map/data/types/vector/style';
import { getHighlightLayerId, HighlightLayerRegistry } from '$routes/map/utils/layers/highlight';
import { createMorivisLayerMetadata, getMorivisLogicalLayerId } from '$routes/map/utils/layers/id';
import { getTemporalFilter } from '$routes/map/utils/layers/vector/filter';
import { createSymbolLayer } from '$routes/map/utils/layers/vector/label';
import { createPointIconLayer } from '$routes/map/utils/layers/vector/point';
import {
	createFillExtrusionPatternLayer,
	createOutLineLayer
} from '$routes/map/utils/layers/vector/polygon';
import { clickableVectorIds } from '$routes/stores';
import type {
	CircleLayerSpecification,
	FillExtrusionLayerSpecification,
	FillLayerSpecification,
	FilterSpecification,
	LayerSpecification,
	LineLayerSpecification,
	SymbolLayerSpecification
} from 'maplibre-gl';

import { createVectorLayer, type LayerItem } from '$routes/map/utils/layers';

const createHiddenFilter = (): FilterSpecification => {
	return ['==', ['literal', 1], 0];
};

const applySelectionFilter = <T extends LayerSpecification>(
	layer: T,
	filter: FilterSpecification | undefined
): T => {
	if (!filter) return layer;
	const targetLayer = layer as T & {
		filter?: FilterSpecification;
	};
	return {
		...targetLayer,
		filter: targetLayer.filter ? ['all', targetLayer.filter, filter] : filter
	} as T;
};

export const registerLayerFilterState = ({
	logicalLayerId,
	layer,
	role,
	selectionKey,
	patternKind,
	baseCircleRadius,
	baseCircleStrokeWidth
}: {
	logicalLayerId: string;
	layer: LayerSpecification;
	role: 'base' | 'highlight';
	selectionKey?: string;
	patternKind?: 'fill' | 'line' | 'point';
	baseCircleRadius?: number;
	baseCircleStrokeWidth?: number;
}) => {
	HighlightLayerRegistry.add({
		logicalLayerId,
		actualLayerId: layer.id,
		role,
		selectionKey,
		patternKind,
		baseCircleRadius,
		baseCircleStrokeWidth,
		defaultFilter: (
			layer as LayerSpecification & {
				filter?: FilterSpecification;
			}
		).filter
	});
};

export const createBaseLayerItem = (entry: GeoDataEntry): LayerItem => {
	const { metaData, style } = entry;

	return {
		id: `${entry.id}`,
		source: `${entry.id}_source`,
		maxzoom: 'maxZoom' in style ? (style.maxZoom ?? 24) : 24,
		minzoom: 'minZoom' in style
			? (style.minZoom ?? metaData.minZoom ?? 1)
			: (metaData.minZoom ?? 1),
		metadata: createMorivisLayerMetadata(entry.id, 'base')
	};
};

const createHighlightLayer = (
	layer: LayerSpecification,
	style: VectorStyle,
	options: {
		useLinePattern?: boolean;
	} = {}
): LayerSpecification | undefined => {
	const { useLinePattern = true } = options;
	const logicalLayerId = getMorivisLogicalLayerId(layer.metadata) ?? layer.id;
	const metadata = createMorivisLayerMetadata(logicalLayerId, 'highlight', layer.metadata);

	// if (style.type === 'circle' && style.markerType === 'icon' && layer.type === 'symbol') {
	// 	return {
	// 		id: getHighlightLayerId(layer.id),
	// 		type: 'circle',
	// 		source: layer.source,
	// 		minzoom: layer.minzoom,
	// 		maxzoom: layer.maxzoom,
	// 		metadata,
	// 		...('source-layer' in layer && layer['source-layer']
	// 			? { 'source-layer': layer['source-layer'] }
	// 			: {}),
	// 		paint: {
	// 			'circle-color': HIGHLIGHT_LAYER_COLOR,
	// 			'circle-opacity': 0.8,
	// 			'circle-radius': 10,
	// 			'circle-stroke-color': HIGHLIGHT_LAYER_COLOR,
	// 			'circle-stroke-opacity': 1,
	// 			'circle-stroke-width': 3
	// 		}
	// 	} as CircleLayerSpecification;
	// }

	switch (layer.type) {
		case 'fill':
			return {
				...layer,
				id: getHighlightLayerId(layer.id),
				metadata,
				paint: {
					...layer.paint,
					'fill-color': HIGHLIGHT_LAYER_COLOR,
					// 'fill-pattern': HIGHLIGHT_FILL_PATTERN_ID,

					'fill-opacity': 0.8,
					'fill-outline-color': HIGHLIGHT_LAYER_COLOR
				}
			} as FillLayerSpecification;
		case 'line':
			return {
				...layer,
				id: getHighlightLayerId(layer.id),
				metadata,
				paint: {
					...layer.paint,
					// ...(useLinePattern ? { 'line-pattern': HIGHLIGHT_LINE_PATTERN_ID } : {}),
					'line-color': HIGHLIGHT_LAYER_COLOR,
					'line-opacity': 1
				}
			} as LineLayerSpecification;
		case 'circle':
			return {
				...layer,
				id: getHighlightLayerId(layer.id),
				metadata,
				paint: {
					...layer.paint,
					'circle-color': HIGHLIGHT_LAYER_COLOR,
					'circle-opacity': 0.8,
					'circle-stroke-color': HIGHLIGHT_LAYER_COLOR,
					'circle-stroke-opacity': 1
				}
			} as CircleLayerSpecification;
		case 'fill-extrusion':
			return {
				...layer,
				id: getHighlightLayerId(layer.id),
				metadata,
				paint: {
					...layer.paint,
					'fill-extrusion-color': HIGHLIGHT_LAYER_COLOR,
					'fill-extrusion-opacity': 0.8
				}
			} as FillExtrusionLayerSpecification;
		case 'symbol':
			return {
				...layer,
				id: getHighlightLayerId(layer.id),
				metadata,
				paint: {
					...layer.paint,
					'text-color': '#006688',
					'text-halo-color': '#ffffff',
					'icon-opacity': 1,
					'text-opacity': 1
				}
			} as SymbolLayerSpecification;
		default:
			return undefined;
	}
};

export const registerHighlightLayers = ({
	logicalLayerId,
	baseLayer,
	style,
	selectionKey,
	registerBase = true,
	useLinePattern = true
}: {
	logicalLayerId: string;
	baseLayer: LayerSpecification;
	style: VectorStyle;
	selectionKey?: string;
	registerBase?: boolean;
	useLinePattern?: boolean;
}) => {
	if (registerBase) {
		registerLayerFilterState({
			logicalLayerId,
			layer: baseLayer,
			role: 'base',
			selectionKey
		});
	}

	const baseHighlightLayer = createHighlightLayer(baseLayer, style, {
		useLinePattern
	});
	if (!baseHighlightLayer) return undefined;

	const highlightLayer = applySelectionFilter(baseHighlightLayer, createHiddenFilter());
	registerLayerFilterState({
		logicalLayerId,
		layer: baseHighlightLayer,
		role: 'highlight',
		selectionKey,
		patternKind: baseLayer.type === 'fill'
			? 'fill'
			: baseLayer.type === 'line' && useLinePattern
			? 'line'
			: baseHighlightLayer.type === 'circle'
			? 'point'
			: undefined,
		baseCircleRadius: baseHighlightLayer.type === 'circle'
				&& typeof baseHighlightLayer.paint?.['circle-radius'] === 'number'
			? baseHighlightLayer.paint['circle-radius']
			: undefined,
		baseCircleStrokeWidth: baseHighlightLayer.type === 'circle'
				&& typeof baseHighlightLayer.paint?.['circle-stroke-width'] === 'number'
			? baseHighlightLayer.paint['circle-stroke-width']
			: undefined
	});

	return highlightLayer;
};

export const createHighlightLayerItems = (_dataEntries: GeoDataEntry[]) => {
	const highlightLayerItems: LayerSpecification[] = [];
	const highlightClickableIds: string[] = [];
	HighlightLayerRegistry.clear();

	_dataEntries
		.filter((entry) => entry.style.visible && entry.type === 'vector')
		.reverse()
		.forEach((entry) => {
			if (entry.type !== 'vector') return;

			const vectorEntry = entry as GeoDataEntry & {
				style: VectorStyle;
				properties: VectorProperties & { fields: FieldDef[]; };
			};
			const temporalFilter = getTemporalFilter(vectorEntry);
			const layer: LayerItem = {
				...createBaseLayerItem(vectorEntry),
				...(temporalFilter ? { filter: temporalFilter } : {})
			};

			if ('sourceLayer' in vectorEntry.metaData) {
				layer['source-layer'] = vectorEntry.metaData.sourceLayer as string;
			}

			const { style } = vectorEntry;
			const layerId = `${vectorEntry.id}`;
			const selectionKey = 'sourceLayer' in vectorEntry.metaData
				? vectorEntry.metaData.promoteId
				: undefined;
			const vectorLayer = createVectorLayer(
				layer,
				style,
				vectorEntry.properties.fields,
				vectorEntry.properties.images?.icon
			);

			if (!vectorLayer) return;
			registerLayerFilterState({
				logicalLayerId: layerId,
				layer: vectorLayer,
				role: 'base',
				selectionKey
			});

			const highlightVectorLayer = registerHighlightLayers({
				logicalLayerId: layerId,
				baseLayer: vectorLayer,
				style,
				selectionKey,
				registerBase: false
			});

			if (highlightVectorLayer) {
				highlightLayerItems.push(highlightVectorLayer);
				highlightClickableIds.push(highlightVectorLayer.id);
			}

			if (style.type === 'circle') {
				const pointIconLayer = createPointIconLayer(layer, style);
				if (pointIconLayer) {
					registerLayerFilterState({
						logicalLayerId: layerId,
						layer: pointIconLayer,
						role: 'base',
						selectionKey
					});
					const highlightPointIconLayer = registerHighlightLayers({
						logicalLayerId: layerId,
						baseLayer: pointIconLayer,
						style,
						selectionKey,
						registerBase: false
					});

					if (highlightPointIconLayer) {
						highlightLayerItems.push(highlightPointIconLayer);
						highlightClickableIds.push(highlightPointIconLayer.id);
					}
				}
			}

			if (style.type === 'fill' && style.extrusion?.show) {
				const fillExtrusionPatternLayer = createFillExtrusionPatternLayer(layer, style);
				if (fillExtrusionPatternLayer) {
					registerLayerFilterState({
						logicalLayerId: layerId,
						layer: fillExtrusionPatternLayer,
						role: 'base',
						selectionKey
					});
				}
			}

			if (style.type === 'fill' && style.outline.show) {
				const lineLayer = createOutLineLayer(layer, style);
				registerLayerFilterState({
					logicalLayerId: layerId,
					layer: lineLayer,
					role: 'base',
					selectionKey
				});
				const highlightOutlineLayer = registerHighlightLayers({
					logicalLayerId: layerId,
					baseLayer: lineLayer,
					style,
					selectionKey,
					registerBase: false,
					useLinePattern: false
				});

				if (highlightOutlineLayer) {
					highlightLayerItems.push(highlightOutlineLayer);
				}
			}

			if (style.labels.show) {
				const symbolLayer = createSymbolLayer(layer, style, vectorEntry.properties.fields);
				registerLayerFilterState({
					logicalLayerId: layerId,
					layer: symbolLayer,
					role: 'base',
					selectionKey
				});
				const highlightLabelLayer = registerHighlightLayers({
					logicalLayerId: layerId,
					baseLayer: symbolLayer,
					style,
					selectionKey,
					registerBase: false
				});

				if (highlightLabelLayer) {
					highlightLayerItems.push(highlightLabelLayer);
				}
			}
		});

	clickableVectorIds.update((currentLayerIds) => {
		return [...currentLayerIds, ...highlightClickableIds];
	});

	return highlightLayerItems;
};
