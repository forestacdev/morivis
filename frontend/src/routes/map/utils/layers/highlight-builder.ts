import { HIGHLIGHT_LAYER_COLOR } from '$routes/constants';
import type { GeoDataEntry } from '$routes/map/data/types';
import type { FieldDef } from '$routes/map/data/types/vector/properties';
import type { VectorStyle } from '$routes/map/data/types/vector/style';
import {
	HIGHLIGHT_FILL_PATTERN_ID,
	HIGHLIGHT_LINE_PATTERN_ID,
	HighlightLayerRegistry,
	getHighlightLayerId
} from '$routes/map/utils/layers/highlight';
import { createFillExtrusionPatternLayer, createOutLineLayer } from '$routes/map/utils/layers/vector/polygon';
import { createSymbolLayer } from '$routes/map/utils/layers/vector/label';
import { clickableVectorIds } from '$routes/stores';
import type {
	LayerSpecification,
	FillLayerSpecification,
	LineLayerSpecification,
	SymbolLayerSpecification,
	CircleLayerSpecification,
	FillExtrusionLayerSpecification,
	FilterSpecification
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
	patternKind,
	baseCircleRadius,
	baseCircleStrokeWidth
}: {
	logicalLayerId: string;
	layer: LayerSpecification;
	role: 'base' | 'highlight';
	patternKind?: 'fill' | 'line' | 'point';
	baseCircleRadius?: number;
	baseCircleStrokeWidth?: number;
}) => {
	HighlightLayerRegistry.add({
		logicalLayerId,
		actualLayerId: layer.id,
		role,
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
		minzoom:
			'minZoom' in style ? (style.minZoom ?? metaData.minZoom ?? 1) : (metaData.minZoom ?? 1)
	};
};

export const applyVectorSourceLayer = (layer: LayerItem, entry: GeoDataEntry) => {
	const { format, metaData } = entry;

	if (
		format.type === 'mvt' ||
		format.type === 'pmtiles' ||
		format.type === 'mbtiles' ||
		format.type === 'geojsontile' ||
		format.type === 'esri-feature'
	) {
		if ('sourceLayer' in metaData) {
			layer['source-layer'] = metaData.sourceLayer as string;
		}
	}

	return layer;
};

const createHighlightLayer = (
	layer: LayerSpecification,
	style: VectorStyle
): LayerSpecification | undefined => {
	if (style.type === 'circle' && style.markerType === 'icon' && layer.type === 'symbol') {
		return {
			id: getHighlightLayerId(layer.id),
			type: 'circle',
			source: layer.source,
			minzoom: layer.minzoom,
			maxzoom: layer.maxzoom,
			...(layer.metadata ? { metadata: layer.metadata } : {}),
			...('source-layer' in layer && layer['source-layer']
				? { 'source-layer': layer['source-layer'] }
				: {}),
			paint: {
				'circle-color': HIGHLIGHT_LAYER_COLOR,
				'circle-opacity': 0.22,
				'circle-radius': 10,
				'circle-stroke-color': HIGHLIGHT_LAYER_COLOR,
				'circle-stroke-opacity': 0.95,
				'circle-stroke-width': 3
			}
		} as CircleLayerSpecification;
	}

	switch (layer.type) {
		case 'fill':
			return {
				...layer,
				id: getHighlightLayerId(layer.id),
				paint: {
					...layer.paint,
					'fill-pattern': HIGHLIGHT_FILL_PATTERN_ID,
					'fill-opacity': 1,
					'fill-outline-color': HIGHLIGHT_LAYER_COLOR
				}
			} as FillLayerSpecification;
		case 'line':
			return {
				...layer,
				id: getHighlightLayerId(layer.id),
				paint: {
					...layer.paint,
					'line-pattern': HIGHLIGHT_LINE_PATTERN_ID,
					'line-color': HIGHLIGHT_LAYER_COLOR,
					'line-opacity': 1
				}
			} as LineLayerSpecification;
		case 'circle':
			return {
				...layer,
				id: getHighlightLayerId(layer.id),
				paint: {
					...layer.paint,
					'circle-color': HIGHLIGHT_LAYER_COLOR,
					'circle-opacity': 1,
					'circle-stroke-color': HIGHLIGHT_LAYER_COLOR,
					'circle-stroke-opacity': 1
				}
			} as CircleLayerSpecification;
		case 'fill-extrusion':
			return {
				...layer,
				id: getHighlightLayerId(layer.id),
				paint: {
					...layer.paint,
					'fill-extrusion-color': HIGHLIGHT_LAYER_COLOR,
					'fill-extrusion-opacity': 0.85
				}
			} as FillExtrusionLayerSpecification;
		case 'symbol':
			return {
				...layer,
				id: getHighlightLayerId(layer.id),
				paint: {
					...layer.paint,
					'text-color': HIGHLIGHT_LAYER_COLOR,
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
	registerBase = true
}: {
	logicalLayerId: string;
	baseLayer: LayerSpecification;
	style: VectorStyle;
	registerBase?: boolean;
}) => {
	if (registerBase) {
		registerLayerFilterState({
			logicalLayerId,
			layer: baseLayer,
			role: 'base'
		});
	}

	const baseHighlightLayer = createHighlightLayer(baseLayer, style);
	if (!baseHighlightLayer) return undefined;

	const highlightLayer = applySelectionFilter(baseHighlightLayer, createHiddenFilter());
	registerLayerFilterState({
		logicalLayerId,
		layer: baseHighlightLayer,
		role: 'highlight',
		patternKind:
			baseLayer.type === 'fill'
				? 'fill'
				: baseLayer.type === 'line'
					? 'line'
					: baseHighlightLayer.type === 'circle'
						? 'point'
						: undefined,
		baseCircleRadius:
			baseHighlightLayer.type === 'circle' &&
			typeof baseHighlightLayer.paint?.['circle-radius'] === 'number'
				? baseHighlightLayer.paint['circle-radius']
				: undefined,
		baseCircleStrokeWidth:
			baseHighlightLayer.type === 'circle' &&
			typeof baseHighlightLayer.paint?.['circle-stroke-width'] === 'number'
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
				properties: { fields: FieldDef[] };
			};
			const layer = applyVectorSourceLayer(createBaseLayerItem(vectorEntry), vectorEntry);
			const { style } = vectorEntry;
			const layerId = `${vectorEntry.id}`;
			const vectorLayer = createVectorLayer(layer, style);

			if (!vectorLayer) return;
			registerLayerFilterState({
				logicalLayerId: layerId,
				layer: vectorLayer,
				role: 'base'
			});

			const highlightVectorLayer = registerHighlightLayers({
				logicalLayerId: layerId,
				baseLayer: vectorLayer,
				style,
				registerBase: false
			});

			if (highlightVectorLayer) {
				highlightLayerItems.push(highlightVectorLayer);
				highlightClickableIds.push(highlightVectorLayer.id);
			}

			if (style.type === 'fill' && style.extrusion && style.extrusion.show) {
				const fillExtrusionPatternLayer = createFillExtrusionPatternLayer(layer, style);
				registerLayerFilterState({
					logicalLayerId: layerId,
					layer: fillExtrusionPatternLayer,
					role: 'base'
				});
			}

			if (style.type === 'fill' && style.outline.show) {
				const lineLayer = createOutLineLayer(layer, style);
				registerLayerFilterState({
					logicalLayerId: layerId,
					layer: lineLayer,
					role: 'base'
				});
				const highlightOutlineLayer = registerHighlightLayers({
					logicalLayerId: layerId,
					baseLayer: lineLayer,
					style,
					registerBase: false
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
					role: 'base'
				});
				const highlightLabelLayer = registerHighlightLayers({
					logicalLayerId: layerId,
					baseLayer: symbolLayer,
					style,
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
