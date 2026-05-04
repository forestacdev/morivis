import type { FilterSpecification, ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl';

import type { SelectedHighlightData } from '$routes/stores';
// import { HIGHLIGHT_LAYER_COLOR } from '$routes/constants';

export const HIGHLIGHT_LAYER_PREFIX = '@highlight_';
// NOTE: ハイライトを単純な塗りつぶしに戻したため、テクスチャ生成一式は退避中。
// const HIGHLIGHT_FILL_PATTERN_PREFIX = 'highlight-fill-pattern-';
// const HIGHLIGHT_LINE_PATTERN_PREFIX = 'highlight-line-pattern-';
// const HIGHLIGHT_FILL_PATTERN_FRAME_COUNT = 16;
// const HIGHLIGHT_FILL_PATTERN_SIZE = 32;
// const HIGHLIGHT_FILL_PATTERN_SPACING = 8;
// const HIGHLIGHT_FILL_PATTERN_STRIPE_WIDTH = 2;
// const HIGHLIGHT_LINE_PATTERN_WIDTH = 32;
// const HIGHLIGHT_LINE_PATTERN_HEIGHT = 32;
// const HIGHLIGHT_LINE_PATTERN_BAND_WIDTH = 12;
// const highlightFillPatternImageCache = new Map<
// 	string,
// 	{ width: number; height: number; data: Uint8Array }
// >();
//
// export const HIGHLIGHT_FILL_PATTERN_IDS = Array.from(
// 	{ length: HIGHLIGHT_FILL_PATTERN_FRAME_COUNT },
// 	(_, index) => `${HIGHLIGHT_FILL_PATTERN_PREFIX}${index}`
// );
// export const HIGHLIGHT_LINE_PATTERN_IDS = Array.from(
// 	{ length: HIGHLIGHT_FILL_PATTERN_FRAME_COUNT },
// 	(_, index) => `${HIGHLIGHT_LINE_PATTERN_PREFIX}${index}`
// );
// export const HIGHLIGHT_FILL_PATTERN_ID = HIGHLIGHT_FILL_PATTERN_IDS[0];
// export const HIGHLIGHT_LINE_PATTERN_ID = HIGHLIGHT_LINE_PATTERN_IDS[0];
//
// const hexToRgb = (hex: string) => {
// 	const normalized = hex.replace('#', '');
// 	const value = Number.parseInt(normalized, 16);
//
// 	return {
// 		r: (value >> 16) & 255,
// 		g: (value >> 8) & 255,
// 		b: value & 255
// 	};
// };

export const getHighlightLayerId = (layerId: string) => {
	return `${HIGHLIGHT_LAYER_PREFIX}${layerId}`;
};

export const isHighlightLayerId = (layerId: string) => {
	return layerId.startsWith(HIGHLIGHT_LAYER_PREFIX);
};

export const getBaseLayerId = (layerId: string) => {
	return isHighlightLayerId(layerId) ? layerId.slice(HIGHLIGHT_LAYER_PREFIX.length) : layerId;
};

// export const isHighlightFillPatternId = (id: string) => {
// 	return id.startsWith(HIGHLIGHT_FILL_PATTERN_PREFIX);
// };
//
// export const isHighlightLinePatternId = (id: string) => {
// 	return id.startsWith(HIGHLIGHT_LINE_PATTERN_PREFIX);
// };
//
// const getHighlightFillPatternFrame = (id: string) => {
// 	if (!isHighlightFillPatternId(id)) return 0;
// 	const frame = Number.parseInt(id.slice(HIGHLIGHT_FILL_PATTERN_PREFIX.length), 10);
// 	return Number.isNaN(frame) ? 0 : frame;
// };
//
// const getHighlightLinePatternFrame = (id: string) => {
// 	if (!isHighlightLinePatternId(id)) return 0;
// 	const frame = Number.parseInt(id.slice(HIGHLIGHT_LINE_PATTERN_PREFIX.length), 10);
// 	return Number.isNaN(frame) ? 0 : frame;
// };
//
// export const createHighlightFillPatternImage = (id: string, frame = 0) => {
// 	const resolvedFrame = isHighlightFillPatternId(id)
// 		? getHighlightFillPatternFrame(id)
// 		: isHighlightLinePatternId(id)
// 			? getHighlightLinePatternFrame(id)
// 			: frame;
// 	const cacheKey = isHighlightLinePatternId(id)
// 		? `${HIGHLIGHT_LINE_PATTERN_PREFIX}${resolvedFrame}`
// 		: `${HIGHLIGHT_FILL_PATTERN_PREFIX}${resolvedFrame}`;
// 	const cachedImage = highlightFillPatternImageCache.get(cacheKey);
// 	if (cachedImage) return cachedImage;
//
// 	if (!isHighlightFillPatternId(id) && !isHighlightLinePatternId(id)) return null;
//
// 	const { r, g, b } = hexToRgb(HIGHLIGHT_LAYER_COLOR);
// 	const frameOffset =
// 		((resolvedFrame % HIGHLIGHT_FILL_PATTERN_FRAME_COUNT) +
// 			HIGHLIGHT_FILL_PATTERN_FRAME_COUNT) %
// 		HIGHLIGHT_FILL_PATTERN_FRAME_COUNT;
//
// 	if (isHighlightLinePatternId(id)) {
// 		const width = HIGHLIGHT_LINE_PATTERN_WIDTH;
// 		const height = HIGHLIGHT_LINE_PATTERN_HEIGHT;
// 		const bytesPerPixel = 4;
// 		const data = new Uint8Array(width * height * bytesPerPixel);
// 		const bandOffset = Math.floor((frameOffset * width) / HIGHLIGHT_FILL_PATTERN_FRAME_COUNT);
//
// 		for (let y = 0; y < height; y += 1) {
// 			for (let x = 0; x < width; x += 1) {
// 				const targetIndex = (y * width + x) * bytesPerPixel;
// 				const distance = Math.abs(x - bandOffset);
// 				const distanceToBand = Math.min(distance, width - distance);
// 				const alpha = distanceToBand <= HIGHLIGHT_LINE_PATTERN_BAND_WIDTH ? 255 : 0;
//
// 				data[targetIndex] = r;
// 				data[targetIndex + 1] = g;
// 				data[targetIndex + 2] = b;
// 				data[targetIndex + 3] = alpha;
// 			}
// 		}
//
// 		const image = { width, height, data };
// 		highlightFillPatternImageCache.set(cacheKey, image);
//
// 		return image;
// 	}
//
// 	const size = HIGHLIGHT_FILL_PATTERN_SIZE;
// 	const bytesPerPixel = 4;
// 	const spacing = HIGHLIGHT_FILL_PATTERN_SPACING;
// 	const data = new Uint8Array(size * size * bytesPerPixel);
// 	const phaseOffset = Math.floor(frameOffset / 2);
//
// 	for (let y = 0; y < size; y += 1) {
// 		for (let x = 0; x < size; x += 1) {
// 			const targetIndex = (y * size + x) * bytesPerPixel;
// 			const diagonal = (((x + y + phaseOffset) % spacing) + spacing) % spacing;
// 			const distanceToStripe = Math.min(diagonal, spacing - diagonal);
// 			const alpha = distanceToStripe <= HIGHLIGHT_FILL_PATTERN_STRIPE_WIDTH ? 255 : 0;
//
// 			data[targetIndex] = r;
// 			data[targetIndex + 1] = g;
// 			data[targetIndex + 2] = b;
// 			data[targetIndex + 3] = alpha;
// 		}
// 	}
//
// 	const image = { width: size, height: size, data };
// 	highlightFillPatternImageCache.set(cacheKey, image);
//
// 	return image;
// };

// export const registerHighlightFillPatternImages = (map: MapLibreMap) => {
// 	[...HIGHLIGHT_FILL_PATTERN_IDS, ...HIGHLIGHT_LINE_PATTERN_IDS].forEach((patternId) => {
// 		if (map.hasImage(patternId)) return;
// 		const image = createHighlightFillPatternImage(patternId);
// 		if (!image) return;
// 		map.addImage(patternId, image);
// 	});
// };

export type HighlightLayerRole = 'base' | 'highlight';
export type HighlightPatternKind = 'fill' | 'line' | 'point';

interface HighlightLayerRegistryItem {
	logicalLayerId: string;
	actualLayerId: string;
	role: HighlightLayerRole;
	defaultFilter?: FilterSpecification;
	selectionKey?: string;
	patternKind?: HighlightPatternKind;
	baseCircleRadius?: number;
	baseCircleStrokeWidth?: number;
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

class HighlightLayerRegistry {
	private static items: HighlightLayerRegistryItem[] = [];

	static clear = () => {
		this.items = [];
	};

	static add = (item: HighlightLayerRegistryItem) => {
		this.items.push(item);
	};

	static syncPatternAnimation = (
		map: MapLibreMap | null,
		selected: SelectedHighlightData | null
	) => {
		void map;
		void selected;
	};

	static getFilterUpdates = (selected: SelectedHighlightData | null) => {
		return this.items.map((item) => {
			const isSelectedLayer = selected?.layerId === item.logicalLayerId;
			const filter =
				item.role === 'highlight'
					? mergeFilter(
							item.defaultFilter,
							isSelectedLayer
								? createSelectedOnlyFilter(selected.featureId, item.selectionKey)
								: HIDDEN_FILTER
						)
					: mergeFilter(
							item.defaultFilter,
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
