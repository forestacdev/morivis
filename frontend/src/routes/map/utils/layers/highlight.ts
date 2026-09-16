import { HIGHLIGHT_LAYER_COLOR } from '$routes/constants';
import { getMorivisLogicalLayerId, getSublayerBaseId } from '$routes/map/utils/layers/id';
import type {
	AllLayoutProperties,
	AllPaintProperties,
	ExpressionSpecification,
	FilterSpecification,
	Map as MapLibreMap,
	StyleImageInterface
} from '$routes/map/utils/maplibre';
import {
	createStaticFillPatternImage,
	createStaticLinePatternImage
} from '$routes/map/utils/style/highlight-pattern';
import type { SelectedHighlightData } from '$routes/stores';

export const HIGHLIGHT_LAYER_PREFIX = '@highlight_';
const HIGHLIGHT_FILL_PATTERN_ID_PREFIX = 'morivis-highlight-fill-pattern';
const HIGHLIGHT_LINE_PATTERN_ID_PREFIX = 'morivis-highlight-line-pattern';
const ZONE_BBOX_FILL_PATTERN_ID_PREFIX = 'morivis-zone-bbox-fill-pattern';
export const HIGHLIGHT_FILL_PATTERN_ID = `${HIGHLIGHT_FILL_PATTERN_ID_PREFIX}-0`;
export const HIGHLIGHT_LINE_PATTERN_ID = `${HIGHLIGHT_LINE_PATTERN_ID_PREFIX}-0`;
export const ZONE_BBOX_FILL_PATTERN_ID = `${ZONE_BBOX_FILL_PATTERN_ID_PREFIX}-0`;
const ZONE_BBOX_LAYER_ID = '@zone_bbox_select';
const ZONE_BBOX_PATTERN_COLOR = '#ff0000';

type HighlightPatternProperty = 'fill-pattern' | 'fill-extrusion-pattern' | 'line-pattern';

const registerStaticPatternImage = (
	map: MapLibreMap,
	id: string,
	imageFactory: () => StyleImageInterface
) => {
	if (map.hasImage(id)) return;
	map.addImage(id, imageFactory());
};

export const warmupHighlightAnimationImages = () => {};

export const scheduleHighlightAnimationWarmup = () => {};

export const getHighlightLayerId = (layerId: string) => {
	return `${HIGHLIGHT_LAYER_PREFIX}${layerId}`;
};

export const isHighlightLayerId = (layerId: string) => {
	return layerId.startsWith(HIGHLIGHT_LAYER_PREFIX);
};

export const getBaseLayerId = (layerId: string) => {
	const resolvedLayerId = isHighlightLayerId(layerId)
		? layerId.slice(HIGHLIGHT_LAYER_PREFIX.length)
		: layerId;
	return getSublayerBaseId(resolvedLayerId);
};

export const getLogicalLayerIdFromLayer = (layer: { id: string; metadata?: unknown; }) => {
	return getMorivisLogicalLayerId(layer.metadata) ?? getBaseLayerId(layer.id);
};

export const ensureHighlightAnimationImages = (map: MapLibreMap) => {
	registerStaticPatternImage(
		map,
		HIGHLIGHT_FILL_PATTERN_ID,
		() => createStaticFillPatternImage(HIGHLIGHT_LAYER_COLOR)
	);
	registerStaticPatternImage(
		map,
		HIGHLIGHT_LINE_PATTERN_ID,
		() => createStaticLinePatternImage(HIGHLIGHT_LAYER_COLOR)
	);
	registerStaticPatternImage(
		map,
		ZONE_BBOX_FILL_PATTERN_ID,
		() => createStaticFillPatternImage(ZONE_BBOX_PATTERN_COLOR)
	);
};

export type HighlightLayerRole = 'base' | 'highlight';
export type HighlightPatternKind = 'fill' | 'line' | 'point';

interface HighlightLayerRegistryItem {
	logicalLayerId: string;
	actualLayerId: string;
	role: HighlightLayerRole;
	defaultFilter?: FilterSpecification;
	runtimeFilter?: FilterSpecification;
	selectionKey?: string;
	patternKind?: HighlightPatternKind;
	patternProperty?: HighlightPatternProperty;
	baseCircleRadius?: number;
	baseCircleStrokeWidth?: number;
	baseCircleOpacity?: number;
	baseCircleStrokeOpacity?: number;
	baseIconSize?: number;
	baseIconOpacity?: number;
}

const HIDDEN_FILTER: FilterSpecification = ['==', ['literal', 1], 0];

const mergeFilter = (
	baseFilter: FilterSpecification | undefined,
	extraFilter?: FilterSpecification
): FilterSpecification | null => {
	if (!baseFilter && !extraFilter) return null;
	if (!baseFilter) return extraFilter ?? null;
	if (!extraFilter) return baseFilter;
	return ['all', baseFilter as ExpressionSpecification, extraFilter as ExpressionSpecification];
};

const createSelectedOnlyFilter = (
	featureId: string | number,
	selectionKey?: string
): FilterSpecification => {
	if (!selectionKey) {
		return ['==', ['id'], featureId];
	}

	return ['any', ['==', ['id'], featureId], ['==', ['get', selectionKey], featureId]];
};

const createSelectedExcludeFilter = (
	featureId: string | number,
	selectionKey?: string
): FilterSpecification => {
	if (!selectionKey) {
		return ['!=', ['id'], featureId];
	}

	return ['all', ['!=', ['id'], featureId], ['!=', ['get', selectionKey], featureId]];
};

const setPaintProperty = <K extends keyof AllPaintProperties>(
	map: MapLibreMap,
	layerId: string,
	name: K,
	value: AllPaintProperties[K]
) => {
	if (!map.getLayer(layerId)) return;
	map.setPaintProperty(layerId, name, value);
};

const setLayoutProperty = <K extends keyof AllLayoutProperties>(
	map: MapLibreMap,
	layerId: string,
	name: K,
	value: AllLayoutProperties[K]
) => {
	if (!map.getLayer(layerId)) return;
	map.setLayoutProperty(layerId, name, value);
};

class HighlightLayerRegistry {
	private static items: HighlightLayerRegistryItem[] = [];

	private static setStaticPattern = (map: MapLibreMap, item: HighlightLayerRegistryItem) => {
		switch (item.patternProperty) {
			case 'fill-pattern':
				setPaintProperty(
					map,
					item.actualLayerId,
					'fill-pattern',
					HIGHLIGHT_FILL_PATTERN_ID
				);
				break;
			case 'fill-extrusion-pattern':
				setPaintProperty(
					map,
					item.actualLayerId,
					'fill-extrusion-pattern',
					HIGHLIGHT_FILL_PATTERN_ID
				);
				break;
			case 'line-pattern':
				setPaintProperty(
					map,
					item.actualLayerId,
					'line-pattern',
					HIGHLIGHT_LINE_PATTERN_ID
				);
				break;
			default:
				break;
		}
	};

	private static resetPointLayer = (map: MapLibreMap, item: HighlightLayerRegistryItem) => {
		if (item.baseCircleRadius !== undefined) {
			setPaintProperty(map, item.actualLayerId, 'circle-radius', item.baseCircleRadius);
		}

		if (item.baseCircleStrokeWidth !== undefined) {
			setPaintProperty(
				map,
				item.actualLayerId,
				'circle-stroke-width',
				item.baseCircleStrokeWidth
			);
		}

		if (item.baseCircleOpacity !== undefined) {
			setPaintProperty(map, item.actualLayerId, 'circle-opacity', item.baseCircleOpacity);
		}

		if (item.baseCircleStrokeOpacity !== undefined) {
			setPaintProperty(
				map,
				item.actualLayerId,
				'circle-stroke-opacity',
				item.baseCircleStrokeOpacity
			);
		}

		if (item.baseIconSize !== undefined) {
			setLayoutProperty(map, item.actualLayerId, 'icon-size', item.baseIconSize);
		}

		if (item.baseIconOpacity !== undefined) {
			setPaintProperty(map, item.actualLayerId, 'icon-opacity', item.baseIconOpacity);
		}
	};

	static clear = () => {
		this.items = [];
	};

	static add = (item: HighlightLayerRegistryItem) => {
		this.items.push(item);
	};

	static setRuntimeFilter = (logicalLayerId: string, filter: FilterSpecification | null) => {
		this.items = this.items.map((item) => {
			if (item.logicalLayerId !== logicalLayerId) return item;
			return {
				...item,
				runtimeFilter: filter ?? undefined
			};
		});
	};

	static syncPatternAnimation = (
		map: MapLibreMap | null,
		selected: SelectedHighlightData | null
	) => {
		void selected;
		if (!map) return;

		this.items.forEach((item) => {
			if (item.role !== 'highlight') return;

			if (item.patternKind === 'fill' || item.patternKind === 'line') {
				this.setStaticPattern(map, item);
				return;
			}

			if (item.patternKind === 'point') {
				this.resetPointLayer(map, item);
			}
		});

		if (map.getLayer(ZONE_BBOX_LAYER_ID)) {
			setPaintProperty(map, ZONE_BBOX_LAYER_ID, 'fill-pattern', ZONE_BBOX_FILL_PATTERN_ID);
		}
	};

	static getFilterUpdates = (selected: SelectedHighlightData | null) => {
		return this.items.map((item) => {
			const baseFilter = mergeFilter(item.defaultFilter, item.runtimeFilter);
			const isSelectedLayer = selected?.layerId === item.logicalLayerId;
			const filter = item.role === 'highlight'
				? mergeFilter(
					baseFilter ?? undefined,
					isSelectedLayer
						? createSelectedOnlyFilter(selected.featureId, item.selectionKey)
						: HIDDEN_FILTER
				)
				: mergeFilter(
					baseFilter ?? undefined,
					isSelectedLayer
						? createSelectedExcludeFilter(selected.featureId, item.selectionKey)
						: undefined
				);

			return {
				layerId: item.actualLayerId,
				filter
			};
		});
	};
}

export { HighlightLayerRegistry };
