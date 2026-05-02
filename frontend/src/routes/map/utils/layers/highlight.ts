import type { FilterSpecification, ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl';

import { HIGHLIGHT_LAYER_COLOR } from '$routes/constants';
import type { SelectedHighlightData } from '$routes/stores';

export const HIGHLIGHT_LAYER_PREFIX = '@highlight_';
const HIGHLIGHT_FILL_PATTERN_PREFIX = 'highlight-fill-pattern-';
const HIGHLIGHT_FILL_PATTERN_FRAME_COUNT = 16;
const HIGHLIGHT_FILL_PATTERN_SIZE = 32;
const HIGHLIGHT_FILL_PATTERN_SPACING = 8;
const HIGHLIGHT_FILL_PATTERN_STRIPE_WIDTH = 2;
const HIGHLIGHT_FILL_PATTERN_FRAME_DURATION = 30;
const highlightFillPatternImageCache = new Map<
	string,
	{ width: number; height: number; data: Uint8Array }
>();

export const HIGHLIGHT_FILL_PATTERN_IDS = Array.from(
	{ length: HIGHLIGHT_FILL_PATTERN_FRAME_COUNT },
	(_, index) => `${HIGHLIGHT_FILL_PATTERN_PREFIX}${index}`
);
export const HIGHLIGHT_FILL_PATTERN_ID = HIGHLIGHT_FILL_PATTERN_IDS[0];

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
	return id.startsWith(HIGHLIGHT_FILL_PATTERN_PREFIX);
};

const getHighlightFillPatternFrame = (id: string) => {
	if (!isHighlightFillPatternId(id)) return 0;
	const frame = Number.parseInt(id.slice(HIGHLIGHT_FILL_PATTERN_PREFIX.length), 10);
	return Number.isNaN(frame) ? 0 : frame;
};

export const createHighlightFillPatternImage = (id: string, frame = 0) => {
	const resolvedFrame = isHighlightFillPatternId(id) ? getHighlightFillPatternFrame(id) : frame;
	const cacheKey = `${HIGHLIGHT_FILL_PATTERN_PREFIX}${resolvedFrame}`;
	const cachedImage = highlightFillPatternImageCache.get(cacheKey);
	if (cachedImage) return cachedImage;

	if (!isHighlightFillPatternId(id)) return null;

	const size = HIGHLIGHT_FILL_PATTERN_SIZE;
	const bytesPerPixel = 4;
	const spacing = HIGHLIGHT_FILL_PATTERN_SPACING;
	const data = new Uint8Array(size * size * bytesPerPixel);
	const { r, g, b } = hexToRgb(HIGHLIGHT_LAYER_COLOR);
	const frameOffset =
		((resolvedFrame % HIGHLIGHT_FILL_PATTERN_FRAME_COUNT) + HIGHLIGHT_FILL_PATTERN_FRAME_COUNT) %
		HIGHLIGHT_FILL_PATTERN_FRAME_COUNT;
	const phaseOffset = Math.floor(frameOffset / 2);

	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			const targetIndex = (y * size + x) * bytesPerPixel;
			const diagonal = (((x + y + phaseOffset) % spacing) + spacing) % spacing;
			const distanceToStripe = Math.min(diagonal, spacing - diagonal);
			const alpha = distanceToStripe <= HIGHLIGHT_FILL_PATTERN_STRIPE_WIDTH ? 255 : 0;

			data[targetIndex] = r;
			data[targetIndex + 1] = g;
			data[targetIndex + 2] = b;
			data[targetIndex + 3] = alpha;
		}
	}

	const image = { width: size, height: size, data };
	highlightFillPatternImageCache.set(cacheKey, image);

	return image;
};

export const registerHighlightFillPatternImages = (map: MapLibreMap) => {
	HIGHLIGHT_FILL_PATTERN_IDS.forEach((patternId) => {
		if (map.hasImage(patternId)) return;
		const image = createHighlightFillPatternImage(patternId);
		if (!image) return;
		map.addImage(patternId, image);
	});
};

export type HighlightLayerRole = 'base' | 'highlight';

interface HighlightLayerRegistryItem {
	logicalLayerId: string;
	actualLayerId: string;
	role: HighlightLayerRole;
	defaultFilter?: FilterSpecification;
	usesFillPattern?: boolean;
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
	private static animationFrameId: number | null = null;
	private static animationMap: MapLibreMap | null = null;

	private static setPatternFrame = (map: MapLibreMap, frame: number) => {
		const patternId =
			HIGHLIGHT_FILL_PATTERN_IDS[
				((frame % HIGHLIGHT_FILL_PATTERN_FRAME_COUNT) + HIGHLIGHT_FILL_PATTERN_FRAME_COUNT) %
					HIGHLIGHT_FILL_PATTERN_FRAME_COUNT
			];

		this.items
			.filter((item) => item.role === 'highlight' && item.usesFillPattern && map.getLayer(item.actualLayerId))
			.forEach((item) => {
				map.setPaintProperty(item.actualLayerId, 'fill-pattern', patternId);
			});
	};

	private static stopPatternAnimation = () => {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		if (this.animationMap) {
			this.setPatternFrame(this.animationMap, 0);
		}

		this.animationMap = null;
	};

	static clear = () => {
		this.stopPatternAnimation();
		this.items = [];
	};

	static add = (item: HighlightLayerRegistryItem) => {
		this.items.push(item);
	};

	static syncPatternAnimation = (
		map: MapLibreMap | null,
		selected: SelectedHighlightData | null
	) => {
		const hasAnimatedTarget = this.items.some((item) => {
			return (
				item.logicalLayerId === selected?.layerId &&
				item.role === 'highlight' &&
				item.usesFillPattern
			);
		});

		if (!map || !selected || !hasAnimatedTarget) {
			this.stopPatternAnimation();
			return;
		}

		if (this.animationMap === map && this.animationFrameId !== null) return;

		this.stopPatternAnimation();
		this.animationMap = map;
		const startedAt = performance.now();

		const tick = (timestamp: number) => {
			if (!this.animationMap) return;
			const elapsedFrame =
				Math.floor((timestamp - startedAt) / HIGHLIGHT_FILL_PATTERN_FRAME_DURATION) %
				HIGHLIGHT_FILL_PATTERN_FRAME_COUNT;
			const frame =
				(HIGHLIGHT_FILL_PATTERN_FRAME_COUNT - elapsedFrame) %
				HIGHLIGHT_FILL_PATTERN_FRAME_COUNT;
			this.setPatternFrame(this.animationMap, frame);
			this.animationFrameId = requestAnimationFrame(tick);
		};

		this.animationFrameId = requestAnimationFrame(tick);
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
