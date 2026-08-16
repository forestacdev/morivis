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
	vec2 repeatSize = u_resolution - vec2(1.0);
	vec2 pixel = mod(floor(v_uv * u_resolution), repeatSize);
	float diagonal = mod(pixel.x + pixel.y + u_time * 24.0, ${HIGHLIGHT_FILL_PATTERN_SPACING.toFixed(1)});
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
	float repeatWidth = u_resolution.x - 1.0;
	vec2 pixel = vec2(mod(floor(v_uv.x * u_resolution.x), repeatWidth), floor(v_uv.y * u_resolution.y));
	float bandCenter = mod(u_time * 42.0, repeatWidth);
	float distanceToBand = abs(pixel.x - bandCenter);
	float wrappedDistance = min(distanceToBand, repeatWidth - distanceToBand);
	float band = 1.0 - smoothstep(${(HIGHLIGHT_LINE_PATTERN_BAND_WIDTH - 6).toFixed(1)}, ${HIGHLIGHT_LINE_PATTERN_BAND_WIDTH.toFixed(1)}, wrappedDistance);
	float alpha = mix(0.28, 1.0, band);
	fragColor = vec4(u_color * alpha, alpha);
}`;

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

const sealPatternEdges = (pixels: Uint8Array, width: number, height: number) => {
	const stride = width * 4;
	const lastColumnOffset = (width - 1) * 4;
	const lastRowOffset = (height - 1) * stride;

	for (let y = 0; y < height; y += 1) {
		const rowOffset = y * stride;
		const sourceOffset = rowOffset;
		const targetOffset = rowOffset + lastColumnOffset;
		pixels[targetOffset] = pixels[sourceOffset];
		pixels[targetOffset + 1] = pixels[sourceOffset + 1];
		pixels[targetOffset + 2] = pixels[sourceOffset + 2];
		pixels[targetOffset + 3] = pixels[sourceOffset + 3];
	}

	for (let x = 0; x < width; x += 1) {
		const sourceOffset = x * 4;
		const targetOffset = lastRowOffset + sourceOffset;
		pixels[targetOffset] = pixels[sourceOffset];
		pixels[targetOffset + 1] = pixels[sourceOffset + 1];
		pixels[targetOffset + 2] = pixels[sourceOffset + 2];
		pixels[targetOffset + 3] = pixels[sourceOffset + 3];
	}
};

const createAnimatedWebGLPatternImage = ({
	width,
	height,
	fragmentSource
}: {
	width: number;
	height: number;
	fragmentSource: string;
}): StyleImageInterface => {
	let mapRef: MapLibreMap | null = null;
	let glRef: WebGL2RenderingContext | null = null;
	let program: WebGLProgram | null = null;
	let timeUniform: WebGLUniformLocation | null = null;
	let resolutionUniform: WebGLUniformLocation | null = null;
	let colorUniform: WebGLUniformLocation | null = null;
	let hasInitFailed = false;

	const color = hexToRgb(HIGHLIGHT_LAYER_COLOR);
	const colorUnit = {
		r: color.r / 255,
		g: color.g / 255,
		b: color.b / 255
	};
	const data = new Uint8Array(width * height * 4);

	const teardown = () => {
		if (program && glRef) {
			glRef.deleteProgram(program);
		}

		program = null;
		timeUniform = null;
		resolutionUniform = null;
		colorUniform = null;
		glRef = null;
		hasInitFailed = false;
	};

	const setup = () => {
		if (program && glRef) return true;
		if (hasInitFailed) return false;

		const canvas = createPatternCanvas(width, height);
		if (!canvas) {
			hasInitFailed = true;
			console.error('Failed to create pattern canvas.');
			return false;
		}

		const gl = canvas.getContext('webgl2', {
			alpha: true,
			antialias: false,
			premultipliedAlpha: true
		});
		if (!gl) {
			hasInitFailed = true;
			console.error('WebGL2 is not available for animated highlight patterns.');
			return false;
		}

		try {
			program = createProgram(gl, fragmentSource);
			timeUniform = gl.getUniformLocation(program, 'u_time');
			resolutionUniform = gl.getUniformLocation(program, 'u_resolution');
			colorUniform = gl.getUniformLocation(program, 'u_color');
			glRef = gl;
			return true;
		} catch (error) {
			hasInitFailed = true;
			console.error('Failed to initialize animated highlight pattern shader.', error);
			teardown();
			return false;
		}
	};

	return {
		width,
		height,
		data,
		onAdd: (map) => {
			mapRef = map;
		},
		render: () => {
			if (!setup() || !glRef || !program) {
				return false;
			}

			glRef.bindFramebuffer(glRef.FRAMEBUFFER, null);
			glRef.viewport(0, 0, width, height);
			glRef.useProgram(program);
			glRef.clearColor(0, 0, 0, 0);
			glRef.clear(glRef.COLOR_BUFFER_BIT);

			if (timeUniform) {
				glRef.uniform1f(timeUniform, getAnimationNow() / 1000);
			}

			if (resolutionUniform) {
				glRef.uniform2f(resolutionUniform, width, height);
			}

			if (colorUniform) {
				glRef.uniform3f(colorUniform, colorUnit.r, colorUnit.g, colorUnit.b);
			}

			glRef.drawArrays(glRef.TRIANGLES, 0, 6);
			glRef.readPixels(0, 0, width, height, glRef.RGBA, glRef.UNSIGNED_BYTE, data);
			sealPatternEdges(data, width, height);
			mapRef?.triggerRepaint();
			return true;
		},
		onRemove: () => {
			teardown();
		}
	};
};

const createAnimatedFillPatternImage = (): StyleImageInterface => {
	return createAnimatedWebGLPatternImage({
		width: HIGHLIGHT_FILL_PATTERN_SIZE,
		height: HIGHLIGHT_FILL_PATTERN_SIZE,
		fragmentSource: HIGHLIGHT_FILL_PATTERN_FRAGMENT_SOURCE
	});
};

const createAnimatedLinePatternImage = (): StyleImageInterface => {
	return createAnimatedWebGLPatternImage({
		width: HIGHLIGHT_LINE_PATTERN_WIDTH,
		height: HIGHLIGHT_LINE_PATTERN_HEIGHT,
		fragmentSource: HIGHLIGHT_LINE_PATTERN_FRAGMENT_SOURCE
	});
};

const ensurePointAnimationCleanup = (map: MapLibreMap) => {
	if (pointAnimationCleanupRegistered.has(map)) return;

	pointAnimationCleanupRegistered.add(map);
	map.on('remove', () => {
		const animationFrameId = pointAnimationFrameIds.get(map);
		if (animationFrameId !== undefined && typeof cancelAnimationFrame === 'function') {
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

export const getLogicalLayerIdFromLayer = (layer: { id: string; metadata?: unknown }) => {
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

	private static cancelPointAnimation = (map: MapLibreMap) => {
		const animationFrameId = pointAnimationFrameIds.get(map);
		if (animationFrameId !== undefined && typeof cancelAnimationFrame === 'function') {
			cancelAnimationFrame(animationFrameId);
		}
		pointAnimationFrameIds.delete(map);
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
