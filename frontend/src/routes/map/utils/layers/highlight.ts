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
const HIGHLIGHT_FILL_PATTERN_ID_PREFIX = 'morivis-highlight-fill-pattern';
const HIGHLIGHT_LINE_PATTERN_ID_PREFIX = 'morivis-highlight-line-pattern';
export const HIGHLIGHT_FILL_PATTERN_ID = `${HIGHLIGHT_FILL_PATTERN_ID_PREFIX}-0`;
export const HIGHLIGHT_LINE_PATTERN_ID = `${HIGHLIGHT_LINE_PATTERN_ID_PREFIX}-0`;

const HIGHLIGHT_FILL_PATTERN_SIZE = 64;
const HIGHLIGHT_FILL_PATTERN_SPACING = 16;
const HIGHLIGHT_FILL_PATTERN_STRIPE_WIDTH = 4;
const HIGHLIGHT_FILL_PATTERN_SPEED = 24;
const HIGHLIGHT_FILL_PATTERN_FRAME_COUNT = 32;
const HIGHLIGHT_LINE_PATTERN_WIDTH = 64;
const HIGHLIGHT_LINE_PATTERN_HEIGHT = 16;
const HIGHLIGHT_LINE_PATTERN_BAND_WIDTH = 18;
const HIGHLIGHT_LINE_PATTERN_SPEED = 42;
const HIGHLIGHT_LINE_PATTERN_FRAME_COUNT = 32;
const HIGHLIGHT_POINT_PULSE_DURATION = 1200;
const HIGHLIGHT_POINT_PULSE_SCALE = 0.18;
const HIGHLIGHT_POINT_PULSE_OPACITY_DELTA = 0.18;
const HIGHLIGHT_FILL_PATTERN_CYCLE_DURATION =
	(HIGHLIGHT_FILL_PATTERN_SPACING / HIGHLIGHT_FILL_PATTERN_SPEED) * 1000;
const HIGHLIGHT_LINE_PATTERN_CYCLE_DURATION =
	(HIGHLIGHT_LINE_PATTERN_WIDTH / HIGHLIGHT_LINE_PATTERN_SPEED) * 1000;

const HIGHLIGHT_PATTERN_VERTEX_SOURCE = `#version 300 es
const vec2 positions[6] = vec2[6](
	vec2(-1.0, -1.0),
	vec2(1.0, -1.0),
	vec2(-1.0, 1.0),
	vec2(-1.0, 1.0),
	vec2(1.0, -1.0),
	vec2(1.0, 1.0)
);

out vec2 v_uv;

void main() {
	vec2 position = positions[gl_VertexID];
	v_uv = position * 0.5 + 0.5;
	gl_Position = vec4(position.x, -position.y, 0.0, 1.0);
}`;

const HIGHLIGHT_FILL_PATTERN_FRAGMENT_SOURCE = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_color;

in vec2 v_uv;

out vec4 fragColor;

void main() {
	vec2 pixel = floor(v_uv * u_resolution);
	float diagonal = mod(pixel.x + pixel.y + u_time * ${HIGHLIGHT_FILL_PATTERN_SPEED.toFixed(1)}, ${HIGHLIGHT_FILL_PATTERN_SPACING.toFixed(1)});
	float distanceToStripe = min(diagonal, ${HIGHLIGHT_FILL_PATTERN_SPACING.toFixed(1)} - diagonal);
	float stripe = 1.0 - smoothstep(${(HIGHLIGHT_FILL_PATTERN_STRIPE_WIDTH - 1).toFixed(1)}, ${(HIGHLIGHT_FILL_PATTERN_STRIPE_WIDTH + 0.5).toFixed(1)}, distanceToStripe);
	float alpha = mix(0.34, 0.78, stripe);
	fragColor = vec4(u_color * alpha, alpha);
}`;

const HIGHLIGHT_LINE_PATTERN_FRAGMENT_SOURCE = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_color;

in vec2 v_uv;

out vec4 fragColor;

void main() {
	vec2 pixel = floor(v_uv * u_resolution);
	float bandCenter = mod(u_time * ${HIGHLIGHT_LINE_PATTERN_SPEED.toFixed(1)}, u_resolution.x);
	float distanceToBand = abs(pixel.x - bandCenter);
	float wrappedDistance = min(distanceToBand, u_resolution.x - distanceToBand);
	float band = 1.0 - smoothstep(${(HIGHLIGHT_LINE_PATTERN_BAND_WIDTH - 6).toFixed(1)}, ${HIGHLIGHT_LINE_PATTERN_BAND_WIDTH.toFixed(1)}, wrappedDistance);
	float alpha = mix(0.28, 1.0, band);
	vec3 brightColor = mix(u_color, vec3(1.0), 0.22);
	fragColor = vec4(brightColor * alpha, alpha);
}`;

const pointAnimationFrameIds = new WeakMap<MapLibreMap, number>();
const patternAnimationFrameIds = new WeakMap<MapLibreMap, number>();
const animationCleanupRegistered = new WeakSet<MapLibreMap>();

type HighlightAnimatedPatternKind = 'fill' | 'line';
type HighlightPatternProperty = 'fill-pattern' | 'fill-extrusion-pattern' | 'line-pattern';

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

const createShader = (gl: WebGL2RenderingContext, type: number, source: string) => {
	const shader = gl.createShader(type);
	if (!shader) {
		throw new Error('Failed to create WebGL shader.');
	}

	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const message = gl.getShaderInfoLog(shader) ?? 'Unknown shader compile error.';
		gl.deleteShader(shader);
		throw new Error(message);
	}

	return shader;
};

const createProgram = (gl: WebGL2RenderingContext, fragmentSource: string) => {
	const vertexShader = createShader(gl, gl.VERTEX_SHADER, HIGHLIGHT_PATTERN_VERTEX_SOURCE);
	const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
	const program = gl.createProgram();
	if (!program) {
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);
		throw new Error('Failed to create WebGL program.');
	}

	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	gl.deleteShader(vertexShader);
	gl.deleteShader(fragmentShader);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const message = gl.getProgramInfoLog(program) ?? 'Unknown program link error.';
		gl.deleteProgram(program);
		throw new Error(message);
	}

	return program;
};

const createPatternCanvas = (width: number, height: number) => {
	if (typeof OffscreenCanvas !== 'undefined') {
		return new OffscreenCanvas(width, height);
	}

	if (typeof document !== 'undefined') {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		return canvas;
	}

	return null;
};

const createPatternFrameId = (patternKind: HighlightAnimatedPatternKind, frameIndex: number) => {
	const prefix =
		patternKind === 'fill' ? HIGHLIGHT_FILL_PATTERN_ID_PREFIX : HIGHLIGHT_LINE_PATTERN_ID_PREFIX;
	return `${prefix}-${frameIndex}`;
};

const getPatternFrameCount = (patternKind: HighlightAnimatedPatternKind) => {
	return patternKind === 'fill'
		? HIGHLIGHT_FILL_PATTERN_FRAME_COUNT
		: HIGHLIGHT_LINE_PATTERN_FRAME_COUNT;
};

const getPatternCycleDuration = (patternKind: HighlightAnimatedPatternKind) => {
	return patternKind === 'fill'
		? HIGHLIGHT_FILL_PATTERN_CYCLE_DURATION
		: HIGHLIGHT_LINE_PATTERN_CYCLE_DURATION;
};

const createEmptyPatternFrames = ({
	width,
	height,
	patternKind
}: {
	width: number;
	height: number;
	patternKind: HighlightAnimatedPatternKind;
}) => {
	const frameCount = getPatternFrameCount(patternKind);
	return Array.from({ length: frameCount }, (_, frameIndex) => ({
		id: createPatternFrameId(patternKind, frameIndex),
		image: {
			width,
			height,
			data: new Uint8Array(width * height * 4)
		} satisfies StyleImageInterface
	}));
};

const createPatternFrames = ({
	width,
	height,
	fragmentSource,
	frameCount,
	patternKind
}: {
	width: number;
	height: number;
	fragmentSource: string;
	frameCount: number;
	patternKind: HighlightAnimatedPatternKind;
}) => {
	const color = hexToRgb(HIGHLIGHT_LAYER_COLOR);
	const colorUnit = {
		r: color.r / 255,
		g: color.g / 255,
		b: color.b / 255
	};
	const canvas = createPatternCanvas(width, height);
	if (!canvas) {
		console.error('Failed to create pattern canvas.');
		return createEmptyPatternFrames({ width, height, patternKind });
	}

	const gl = canvas.getContext('webgl2', {
		alpha: true,
		antialias: false,
		premultipliedAlpha: true
	});
	if (!gl) {
		console.error('WebGL2 is not available for animated highlight patterns.');
		return createEmptyPatternFrames({ width, height, patternKind });
	}

	let program: WebGLProgram | null = null;

	try {
		program = createProgram(gl, fragmentSource);
		const timeUniform = gl.getUniformLocation(program, 'u_time');
		const resolutionUniform = gl.getUniformLocation(program, 'u_resolution');
		const colorUniform = gl.getUniformLocation(program, 'u_color');
		const frames = [];

		gl.viewport(0, 0, width, height);
		gl.useProgram(program);

		for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
			const data = new Uint8Array(width * height * 4);
			const time = (frameIndex / frameCount) * (getPatternCycleDuration(patternKind) / 1000);

			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);

			if (timeUniform) {
				gl.uniform1f(timeUniform, time);
			}

			if (resolutionUniform) {
				gl.uniform2f(resolutionUniform, width, height);
			}

			if (colorUniform) {
				gl.uniform3f(colorUniform, colorUnit.r, colorUnit.g, colorUnit.b);
			}

			gl.drawArrays(gl.TRIANGLES, 0, 6);
			gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);

			frames.push({
				id: createPatternFrameId(patternKind, frameIndex),
				image: {
					width,
					height,
					data
				} satisfies StyleImageInterface
			});
		}

		return frames;
	} catch (error) {
		console.error('Failed to initialize animated highlight pattern shader.', error);
		return createEmptyPatternFrames({ width, height, patternKind });
	} finally {
		if (program) {
			gl.deleteProgram(program);
		}
	}
};

const createFillPatternFrames = () => {
	return createPatternFrames({
		width: HIGHLIGHT_FILL_PATTERN_SIZE,
		height: HIGHLIGHT_FILL_PATTERN_SIZE,
		fragmentSource: HIGHLIGHT_FILL_PATTERN_FRAGMENT_SOURCE,
		frameCount: HIGHLIGHT_FILL_PATTERN_FRAME_COUNT,
		patternKind: 'fill'
	});
};

const createLinePatternFrames = () => {
	return createPatternFrames({
		width: HIGHLIGHT_LINE_PATTERN_WIDTH,
		height: HIGHLIGHT_LINE_PATTERN_HEIGHT,
		fragmentSource: HIGHLIGHT_LINE_PATTERN_FRAGMENT_SOURCE,
		frameCount: HIGHLIGHT_LINE_PATTERN_FRAME_COUNT,
		patternKind: 'line'
	});
};

const ensureAnimationCleanup = (map: MapLibreMap) => {
	if (animationCleanupRegistered.has(map)) return;

	animationCleanupRegistered.add(map);
	map.on('remove', () => {
		const pointAnimationFrameId = pointAnimationFrameIds.get(map);
		if (pointAnimationFrameId !== undefined && typeof cancelAnimationFrame === 'function') {
			cancelAnimationFrame(pointAnimationFrameId);
		}

		pointAnimationFrameIds.delete(map);

		const patternAnimationFrameId = patternAnimationFrameIds.get(map);
		if (patternAnimationFrameId !== undefined && typeof cancelAnimationFrame === 'function') {
			cancelAnimationFrame(patternAnimationFrameId);
		}

		patternAnimationFrameIds.delete(map);
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

export const getLogicalLayerIdFromLayer = (layer: { id: string; metadata?: unknown }) => {
	return getMorivisLogicalLayerId(layer.metadata) ?? getBaseLayerId(layer.id);
};

export const ensureHighlightAnimationImages = (map: MapLibreMap) => {
	ensureAnimationCleanup(map);

	if (!map.hasImage(HIGHLIGHT_FILL_PATTERN_ID)) {
		createFillPatternFrames().forEach((frame) => {
			map.addImage(frame.id, frame.image);
		});
	}

	if (!map.hasImage(HIGHLIGHT_LINE_PATTERN_ID)) {
		createLinePatternFrames().forEach((frame) => {
			map.addImage(frame.id, frame.image);
		});
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

const clampOpacity = (value: number) => {
	return Math.max(0, Math.min(1, value));
};

class HighlightLayerRegistry {
	private static items: HighlightLayerRegistryItem[] = [];

	private static getPatternItems = (logicalLayerId?: string) => {
		return this.items.filter((item) => {
			const isAnimatedPattern =
				item.role === 'highlight' && (item.patternKind === 'fill' || item.patternKind === 'line');
			if (!isAnimatedPattern) return false;
			return logicalLayerId ? item.logicalLayerId === logicalLayerId : true;
		});
	};

	private static getPointItems = (logicalLayerId?: string) => {
		return this.items.filter((item) => {
			if (item.role !== 'highlight' || item.patternKind !== 'point') return false;
			return logicalLayerId ? item.logicalLayerId === logicalLayerId : true;
		});
	};

	private static setPatternFrame = (
		map: MapLibreMap,
		item: HighlightLayerRegistryItem,
		patternId: string
	) => {
		switch (item.patternProperty) {
			case 'fill-pattern':
				setPaintProperty(map, item.actualLayerId, 'fill-pattern', patternId);
				break;
			case 'fill-extrusion-pattern':
				setPaintProperty(map, item.actualLayerId, 'fill-extrusion-pattern', patternId);
				break;
			case 'line-pattern':
				setPaintProperty(map, item.actualLayerId, 'line-pattern', patternId);
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
			setPaintProperty(map, item.actualLayerId, 'circle-stroke-width', item.baseCircleStrokeWidth);
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

	private static resetPatternAnimation = (map: MapLibreMap) => {
		this.getPatternItems().forEach((item) => {
			if (!item.patternKind || item.patternKind === 'point') return;
			this.setPatternFrame(map, item, createPatternFrameId(item.patternKind, 0));
		});
	};

	private static cancelPointAnimation = (map: MapLibreMap) => {
		const animationFrameId = pointAnimationFrameIds.get(map);
		if (animationFrameId !== undefined && typeof cancelAnimationFrame === 'function') {
			cancelAnimationFrame(animationFrameId);
		}
		pointAnimationFrameIds.delete(map);
	};

	private static cancelPatternAnimation = (map: MapLibreMap) => {
		const animationFrameId = patternAnimationFrameIds.get(map);
		if (animationFrameId !== undefined && typeof cancelAnimationFrame === 'function') {
			cancelAnimationFrame(animationFrameId);
		}
		patternAnimationFrameIds.delete(map);
	};

	private static startPointAnimation = (map: MapLibreMap, logicalLayerId: string) => {
		const pointItems = this.getPointItems(logicalLayerId);
		if (pointItems.length === 0 || typeof requestAnimationFrame !== 'function') return;

		const animate = () => {
			const progress =
				(getAnimationNow() % HIGHLIGHT_POINT_PULSE_DURATION) / HIGHLIGHT_POINT_PULSE_DURATION;
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
						clampOpacity(item.baseCircleOpacity + pulse * HIGHLIGHT_POINT_PULSE_OPACITY_DELTA)
					);
				}

				if (item.baseCircleStrokeOpacity !== undefined) {
					setPaintProperty(
						map,
						item.actualLayerId,
						'circle-stroke-opacity',
						clampOpacity(item.baseCircleStrokeOpacity - 0.2 + pulse * 0.2)
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

	private static startPatternAnimation = (map: MapLibreMap, logicalLayerId: string) => {
		if (typeof requestAnimationFrame !== 'function') return;

		const patternItems = this.getPatternItems(logicalLayerId);
		const fillItems = patternItems.filter((item) => item.patternKind === 'fill');
		const lineItems = patternItems.filter((item) => item.patternKind === 'line');
		if (fillItems.length === 0 && lineItems.length === 0) return;

		let lastFillFrame = -1;
		let lastLineFrame = -1;

		const animate = () => {
			const now = getAnimationNow();

			if (fillItems.length > 0) {
				const fillFrame = Math.floor(
					((now % HIGHLIGHT_FILL_PATTERN_CYCLE_DURATION) / HIGHLIGHT_FILL_PATTERN_CYCLE_DURATION) *
						HIGHLIGHT_FILL_PATTERN_FRAME_COUNT
				);
				if (fillFrame !== lastFillFrame) {
					fillItems.forEach((item) => {
						this.setPatternFrame(map, item, createPatternFrameId('fill', fillFrame));
					});
					lastFillFrame = fillFrame;
				}
			}

			if (lineItems.length > 0) {
				const lineFrame = Math.floor(
					((now % HIGHLIGHT_LINE_PATTERN_CYCLE_DURATION) / HIGHLIGHT_LINE_PATTERN_CYCLE_DURATION) *
						HIGHLIGHT_LINE_PATTERN_FRAME_COUNT
				);
				if (lineFrame !== lastLineFrame) {
					lineItems.forEach((item) => {
						this.setPatternFrame(map, item, createPatternFrameId('line', lineFrame));
					});
					lastLineFrame = lineFrame;
				}
			}

			const animationFrameId = requestAnimationFrame(animate);
			patternAnimationFrameIds.set(map, animationFrameId);
		};

		const animationFrameId = requestAnimationFrame(animate);
		patternAnimationFrameIds.set(map, animationFrameId);
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

		this.cancelPatternAnimation(map);
		this.cancelPointAnimation(map);
		this.resetPatternAnimation(map);
		this.resetPointAnimation(map);

		if (!selected) return;

		this.startPatternAnimation(map, selected.layerId);
		this.startPointAnimation(map, selected.layerId);
	};

	static getFilterUpdates = (selected: SelectedHighlightData | null) => {
		return this.items.map((item) => {
			const baseFilter = mergeFilter(item.defaultFilter, item.runtimeFilter);
			const isSelectedLayer = selected?.layerId === item.logicalLayerId;
			const filter =
				item.role === 'highlight'
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
