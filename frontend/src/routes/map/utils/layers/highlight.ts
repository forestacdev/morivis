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
import type { SelectedHighlightData } from '$routes/stores';

export const HIGHLIGHT_LAYER_PREFIX = '@highlight_';
export const HIGHLIGHT_FILL_PATTERN_ID = 'morivis-highlight-fill-pattern';
export const HIGHLIGHT_LINE_PATTERN_ID = 'morivis-highlight-line-pattern';

const HIGHLIGHT_FILL_PATTERN_SIZE = 64;
const HIGHLIGHT_FILL_PATTERN_SPACING = 16;
const HIGHLIGHT_FILL_PATTERN_STRIPE_WIDTH = 4;
const HIGHLIGHT_LINE_PATTERN_WIDTH = 64;
const HIGHLIGHT_LINE_PATTERN_HEIGHT = 16;
const HIGHLIGHT_LINE_PATTERN_BAND_WIDTH = 18;
const HIGHLIGHT_POINT_PULSE_DURATION = 1200;
const HIGHLIGHT_POINT_PULSE_SCALE = 0.18;
const HIGHLIGHT_POINT_PULSE_OPACITY_DELTA = 0.18;

const pointAnimationFrameIds = new WeakMap<MapLibreMap, number>();
const pointAnimationCleanupRegistered = new WeakSet<MapLibreMap>();

const hexToRgb = (hex: string) => {
	const normalized = hex.replace('#', '');
	const value = Number.parseInt(normalized, 16);

	return {
		r: (value >> 16) & 255,
		g: (value >> 8) & 255,
		b: value & 255
	};
};

const getAnimationNow = () => {
	if (typeof performance !== 'undefined') {
		return performance.now();
	}

	return Date.now();
};

const setPixel = (
	data: Uint8Array | Uint8ClampedArray,
	index: number,
	color: { r: number; g: number; b: number; },
	alpha: number
) => {
	data[index] = color.r;
	data[index + 1] = color.g;
	data[index + 2] = color.b;
	data[index + 3] = alpha;
};

const createAnimatedPatternImage = ({
	width,
	height,
	renderFrame
}: {
	width: number;
	height: number;
	renderFrame: (data: Uint8Array, now: number) => void;
}): StyleImageInterface => {
	let mapRef: MapLibreMap | null = null;
	const data = new Uint8Array(width * height * 4);

	return {
		width,
		height,
		data,
		onAdd: (map) => {
			mapRef = map;
		},
		render: () => {
			renderFrame(data, getAnimationNow());
			mapRef?.triggerRepaint();
			return true;
		},
		onRemove: () => {
			mapRef = null;
		}
	};
};

const createAnimatedFillPatternImage = (): StyleImageInterface => {
	const color = hexToRgb(HIGHLIGHT_LAYER_COLOR);

	return createAnimatedPatternImage({
		width: HIGHLIGHT_FILL_PATTERN_SIZE,
		height: HIGHLIGHT_FILL_PATTERN_SIZE,
		renderFrame: (data, now) => {
			const phaseOffset = Math.floor(now * 0.02);

			for (let y = 0; y < HIGHLIGHT_FILL_PATTERN_SIZE; y += 1) {
				for (let x = 0; x < HIGHLIGHT_FILL_PATTERN_SIZE; x += 1) {
					const targetIndex = (y * HIGHLIGHT_FILL_PATTERN_SIZE + x) * 4;
					const diagonal = mod(x + y + phaseOffset, HIGHLIGHT_FILL_PATTERN_SPACING);
					const distanceToStripe = Math.min(
						diagonal,
						HIGHLIGHT_FILL_PATTERN_SPACING - diagonal
					);
					const alpha = distanceToStripe <= HIGHLIGHT_FILL_PATTERN_STRIPE_WIDTH ? 196 : 88;
					setPixel(data, targetIndex, color, alpha);
				}
			}
		}
	});
};

const createAnimatedLinePatternImage = (): StyleImageInterface => {
	const color = hexToRgb(HIGHLIGHT_LAYER_COLOR);

	return createAnimatedPatternImage({
		width: HIGHLIGHT_LINE_PATTERN_WIDTH,
		height: HIGHLIGHT_LINE_PATTERN_HEIGHT,
		renderFrame: (data, now) => {
			const bandCenter = Math.floor((now * 0.045) % HIGHLIGHT_LINE_PATTERN_WIDTH);

			for (let y = 0; y < HIGHLIGHT_LINE_PATTERN_HEIGHT; y += 1) {
				for (let x = 0; x < HIGHLIGHT_LINE_PATTERN_WIDTH; x += 1) {
					const targetIndex = (y * HIGHLIGHT_LINE_PATTERN_WIDTH + x) * 4;
					const distance = Math.abs(x - bandCenter);
					const wrappedDistance = Math.min(
						distance,
						HIGHLIGHT_LINE_PATTERN_WIDTH - distance
					);
					const alpha = wrappedDistance <= HIGHLIGHT_LINE_PATTERN_BAND_WIDTH
						? Math.max(144, 255 - wrappedDistance * 8)
						: 84;
					setPixel(data, targetIndex, color, alpha);
				}
			}
		}
	});
};

const ensurePointAnimationCleanup = (map: MapLibreMap) => {
	if (pointAnimationCleanupRegistered.has(map)) return;

	pointAnimationCleanupRegistered.add(map);
	map.on('remove', () => {
		const animationFrameId = pointAnimationFrameIds.get(map);
		if (
			animationFrameId !== undefined
			&& typeof cancelAnimationFrame === 'function'
		) {
			cancelAnimationFrame(animationFrameId);
		}
		pointAnimationFrameIds.delete(map);
	});
};

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
	ensurePointAnimationCleanup(map);

	if (!map.hasImage(HIGHLIGHT_FILL_PATTERN_ID)) {
		map.addImage(HIGHLIGHT_FILL_PATTERN_ID, createAnimatedFillPatternImage());
	}

	if (!map.hasImage(HIGHLIGHT_LINE_PATTERN_ID)) {
		map.addImage(HIGHLIGHT_LINE_PATTERN_ID, createAnimatedLinePatternImage());
	}
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

const clampOpacity = (value: number) => {
	return Math.max(0, Math.min(1, value));
};

const mod = (value: number, divisor: number) => {
	return ((value % divisor) + divisor) % divisor;
};

class HighlightLayerRegistry {
	private static items: HighlightLayerRegistryItem[] = [];

	private static getPointItems = (logicalLayerId?: string) => {
		return this.items.filter((item) => {
			if (item.role !== 'highlight' || item.patternKind !== 'point') return false;
			return logicalLayerId ? item.logicalLayerId === logicalLayerId : true;
		});
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

	private static resetPointAnimation = (map: MapLibreMap) => {
		this.getPointItems().forEach((item) => {
			this.resetPointLayer(map, item);
		});
	};

	private static cancelPointAnimation = (map: MapLibreMap) => {
		const animationFrameId = pointAnimationFrameIds.get(map);
		if (
			animationFrameId !== undefined
			&& typeof cancelAnimationFrame === 'function'
		) {
			cancelAnimationFrame(animationFrameId);
		}
		pointAnimationFrameIds.delete(map);
	};

	private static startPointAnimation = (
		map: MapLibreMap,
		logicalLayerId: string
	) => {
		const pointItems = this.getPointItems(logicalLayerId);
		if (pointItems.length === 0 || typeof requestAnimationFrame !== 'function') return;

		const animate = () => {
			const progress =
				(getAnimationNow() % HIGHLIGHT_POINT_PULSE_DURATION) /
				HIGHLIGHT_POINT_PULSE_DURATION;
			const pulse = 0.5 - Math.cos(progress * Math.PI * 2) / 2;

			pointItems.forEach((item) => {
				if (item.baseCircleRadius !== undefined) {
					setPaintProperty(
						map,
						item.actualLayerId,
						'circle-radius',
						item.baseCircleRadius * (1 + pulse * HIGHLIGHT_POINT_PULSE_SCALE)
					);
				}

				if (item.baseCircleStrokeWidth !== undefined) {
					setPaintProperty(
						map,
						item.actualLayerId,
						'circle-stroke-width',
						item.baseCircleStrokeWidth * (1 + pulse * 0.8)
					);
				}

				if (item.baseCircleOpacity !== undefined) {
					setPaintProperty(
						map,
						item.actualLayerId,
						'circle-opacity',
						clampOpacity(
							item.baseCircleOpacity +
								pulse * HIGHLIGHT_POINT_PULSE_OPACITY_DELTA
						)
					);
				}

				if (item.baseCircleStrokeOpacity !== undefined) {
					setPaintProperty(
						map,
						item.actualLayerId,
						'circle-stroke-opacity',
						clampOpacity(
							item.baseCircleStrokeOpacity - 0.2 + pulse * 0.2
						)
					);
				}

				if (item.baseIconSize !== undefined) {
					setLayoutProperty(
						map,
						item.actualLayerId,
						'icon-size',
						item.baseIconSize * (1 + pulse * HIGHLIGHT_POINT_PULSE_SCALE)
					);
				}

				if (item.baseIconOpacity !== undefined) {
					setPaintProperty(
						map,
						item.actualLayerId,
						'icon-opacity',
						clampOpacity(item.baseIconOpacity - 0.1 + pulse * 0.1)
					);
				}
			});

			const animationFrameId = requestAnimationFrame(animate);
			pointAnimationFrameIds.set(map, animationFrameId);
		};

		const animationFrameId = requestAnimationFrame(animate);
		pointAnimationFrameIds.set(map, animationFrameId);
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
		if (!map) return;

		this.cancelPointAnimation(map);
		this.resetPointAnimation(map);

		if (!selected) return;

		this.startPointAnimation(map, selected.layerId);
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
