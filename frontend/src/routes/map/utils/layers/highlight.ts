import type { FilterSpecification, ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl';

import { HIGHLIGHT_LAYER_COLOR } from '$routes/constants';
import type { SelectedHighlightData } from '$routes/stores';

export const HIGHLIGHT_LAYER_PREFIX = '@highlight_';
export const HIGHLIGHT_FILL_PATTERN_ID = 'highlight-fill-pattern';
const HIGHLIGHT_FILL_PATTERN_SIZE = 16;
const HIGHLIGHT_FILL_PATTERN_SPACING = 8;
const HIGHLIGHT_FILL_PATTERN_STRIPE_WIDTH = 2;
const highlightFillPatternImageCache = new Map<
	string,
	{ width: number; height: number; data: Uint8Array }
>();

const hexToRgb = (hex: string) => {
	const normalized = hex.replace('#', '');
	const value = Number.parseInt(normalized, 16);

	return {
		r: (value >> 16) & 255,
		g: (value >> 8) & 255,
		b: value & 255
	};
};

export const getHighlightLayerId = (layerId: string) => {
	return `${HIGHLIGHT_LAYER_PREFIX}${layerId}`;
};

export const isHighlightLayerId = (layerId: string) => {
	return layerId.startsWith(HIGHLIGHT_LAYER_PREFIX);
};

export const getBaseLayerId = (layerId: string) => {
	return isHighlightLayerId(layerId) ? layerId.slice(HIGHLIGHT_LAYER_PREFIX.length) : layerId;
};

export const isHighlightFillPatternId = (id: string) => {
	return id === HIGHLIGHT_FILL_PATTERN_ID;
};

export const createHighlightFillPatternImage = (id: string) => {
	const cachedImage = highlightFillPatternImageCache.get(id);
	if (cachedImage) return cachedImage;

	if (!isHighlightFillPatternId(id)) return null;

	const size = HIGHLIGHT_FILL_PATTERN_SIZE;
	const spacing = HIGHLIGHT_FILL_PATTERN_SPACING;
	const offset = 0;
	const bytesPerPixel = 4;
	const data = new Uint8Array(size * size * bytesPerPixel);
	const { r, g, b } = hexToRgb(HIGHLIGHT_LAYER_COLOR);

	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			const pixelIndex = (y * size + x) * bytesPerPixel;
			const diagonal = (x + y + offset) % spacing;
			const distanceToStripe = Math.min(diagonal, spacing - diagonal);
			const alpha =
				distanceToStripe <= HIGHLIGHT_FILL_PATTERN_STRIPE_WIDTH
					? 255
					: distanceToStripe <= HIGHLIGHT_FILL_PATTERN_STRIPE_WIDTH + 1
						? 132
						: distanceToStripe <= HIGHLIGHT_FILL_PATTERN_STRIPE_WIDTH + 2
							? 84
							: 40;

			data[pixelIndex] = r;
			data[pixelIndex + 1] = g;
			data[pixelIndex + 2] = b;
			data[pixelIndex + 3] = alpha;
		}
	}

	const image = { width: size, height: size, data };
	highlightFillPatternImageCache.set(id, image);

	return image;
};

export const registerHighlightFillPatternImages = (map: MapLibreMap) => {
	if (map.hasImage(HIGHLIGHT_FILL_PATTERN_ID)) return;
	const image = createHighlightFillPatternImage(HIGHLIGHT_FILL_PATTERN_ID);
	if (!image) return;

	map.addImage(HIGHLIGHT_FILL_PATTERN_ID, image);
};

export type HighlightLayerRole = 'base' | 'highlight';

interface HighlightLayerRegistryItem {
	logicalLayerId: string;
	actualLayerId: string;
	role: HighlightLayerRole;
	defaultFilter?: FilterSpecification;
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

const createSelectedOnlyFilter = (featureId: string | number): FilterSpecification => {
	return ['==', ['id'], featureId];
};

const createSelectedExcludeFilter = (featureId: string | number): FilterSpecification => {
	return ['!=', ['id'], featureId];
};

class HighlightLayerRegistry {
	private static items: HighlightLayerRegistryItem[] = [];

	static clear = () => {
		this.items = [];
	};

	static add = (item: HighlightLayerRegistryItem) => {
		this.items.push(item);
	};

	static getFilterUpdates = (selected: SelectedHighlightData | null) => {
		return this.items.map((item) => {
			const isSelectedLayer = selected?.layerId === item.logicalLayerId;
			const filter =
				item.role === 'highlight'
					? mergeFilter(
							item.defaultFilter,
							isSelectedLayer ? createSelectedOnlyFilter(selected.featureId) : HIDDEN_FILTER
						)
					: mergeFilter(
							item.defaultFilter,
							isSelectedLayer ? createSelectedExcludeFilter(selected.featureId) : undefined
						);

			return {
				layerId: item.actualLayerId,
				filter
			};
		});
	};
}

export { HighlightLayerRegistry };
