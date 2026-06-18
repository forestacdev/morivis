import type { FeatureCollection } from '$routes/map/types/geojson';
import type { AnyGeometry, GeometryType } from '$routes/map/types/geometry';
import type { BandDataRange } from '$routes/map/utils/cache/raster/geotiff-cache';
import { getMinMax, type RasterBands } from '$routes/map/utils/formats/geotiff';
import { SVGPathData, SVGPathDataTransformer } from 'svg-pathdata';

const SVG_DIMENSION_PATTERN = /(?:^|\s)(width|height)\s*=\s*['"]([^'"]+)['"]/gi;
const SVG_VIEWBOX_PATTERN = /(?:^|\s)viewBox\s*=\s*['"]([^'"]+)['"]/i;

const SVG_LENGTH_UNIT_TO_PX: Record<string, number> = {
	px: 1,
	in: 96,
	cm: 96 / 2.54,
	mm: 96 / 25.4,
	pt: 96 / 72,
	pc: 16
};

const parseSvgLength = (value: string | undefined): number | null => {
	if (!value) return null;

	const normalized = value.trim().toLowerCase();
	const match = normalized.match(/^([+-]?(?:\d+\.?\d*|\.\d+))(px|in|cm|mm|pt|pc)?$/);
	if (!match) return null;

	const numeric = Number(match[1]);
	if (!Number.isFinite(numeric) || numeric <= 0) return null;

	const unit = match[2] ?? 'px';
	return numeric * (SVG_LENGTH_UNIT_TO_PX[unit] ?? 1);
};

type SvgViewport = {
	minX: number;
	minY: number;
	width: number;
	height: number;
};

type SvgStyleProperties = {
	id?: string;
	class?: string;
	fill?: string;
	stroke?: string;
	strokeWidth?: number;
	opacity?: number;
	tagName: string;
};

type Matrix2D = [number, number, number, number, number, number];

const IDENTITY_MATRIX: Matrix2D = [1, 0, 0, 1, 0, 0];
const NON_RENDERABLE_CONTAINER_TAGS = new Set([
	'defs',
	'symbol',
	'marker',
	'clipPath',
	'mask',
	'pattern'
]);

export const parseSvgDimensions = (svgText: string): { width: number; height: number; } => {
	const sizeMap: Partial<Record<'width' | 'height', number>> = {};

	for (const match of svgText.matchAll(SVG_DIMENSION_PATTERN)) {
		const key = match[1] as 'width' | 'height';
		const parsed = parseSvgLength(match[2]);
		if (parsed) {
			sizeMap[key] = parsed;
		}
	}

	if (sizeMap.width && sizeMap.height) {
		return {
			width: Math.round(sizeMap.width),
			height: Math.round(sizeMap.height)
		};
	}

	const viewBoxMatch = svgText.match(SVG_VIEWBOX_PATTERN);
	if (viewBoxMatch) {
		const values = viewBoxMatch[1]
			.trim()
			.split(/[\s,]+/)
			.map((value) => Number(value));
		const width = values[2];
		const height = values[3];

		if (
			values.length === 4 && Number.isFinite(width) && Number.isFinite(height) && width > 0
			&& height > 0
		) {
			return {
				width: Math.round(width),
				height: Math.round(height)
			};
		}
	}

	throw new Error('SVG の width / height または viewBox を解釈できませんでした');
};

const parseSvgViewport = (svgText: string): SvgViewport => {
	const dimensions = parseSvgDimensions(svgText);
	const viewBoxMatch = svgText.match(SVG_VIEWBOX_PATTERN);

	if (!viewBoxMatch) {
		return {
			minX: 0,
			minY: 0,
			width: dimensions.width,
			height: dimensions.height
		};
	}

	const values = viewBoxMatch[1]
		.trim()
		.split(/[\s,]+/)
		.map((value) => Number(value));
	const [minX, minY, width, height] = values;

	if (
		values.length !== 4
		|| !Number.isFinite(minX)
		|| !Number.isFinite(minY)
		|| !Number.isFinite(width)
		|| !Number.isFinite(height)
		|| width <= 0
		|| height <= 0
	) {
		throw new Error('SVG の viewBox を解釈できませんでした');
	}

	return {
		minX,
		minY,
		width,
		height
	};
};

const parseSvgXmlDocument = async (svgText: string): Promise<Document> => {
	if (typeof DOMParser !== 'undefined') {
		return new DOMParser().parseFromString(svgText, 'image/svg+xml');
	}

	const { DOMParser: XmldomParser } = await import('@xmldom/xmldom');
	return new XmldomParser().parseFromString(svgText, 'image/svg+xml');
};

const parseNumber = (value: string | null): number | null => {
	if (!value) return null;
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
};

const parseStyleAttribute = (value: string | null): Record<string, string> => {
	if (!value) return {};

	return Object.fromEntries(
		value
			.split(';')
			.map((part) => part.trim())
			.filter(Boolean)
			.map((part) => {
				const [key, rawValue] = part.split(':');
				return [key.trim(), rawValue?.trim() ?? ''];
			})
	);
};

const multiplyMatrix = (left: Matrix2D, right: Matrix2D): Matrix2D => {
	const [a1, b1, c1, d1, e1, f1] = left;
	const [a2, b2, c2, d2, e2, f2] = right;

	return [
		a1 * a2 + c1 * b2,
		b1 * a2 + d1 * b2,
		a1 * c2 + c1 * d2,
		b1 * c2 + d1 * d2,
		a1 * e2 + c1 * f2 + e1,
		b1 * e2 + d1 * f2 + f1
	];
};

const applyMatrix = (matrix: Matrix2D, x: number, y: number): [number, number] => {
	const [a, b, c, d, e, f] = matrix;
	return [a * x + c * y + e, b * x + d * y + f];
};

const parseTransformArguments = (value: string): number[] =>
	value
		.trim()
		.split(/[\s,]+/)
		.map((part) => Number(part))
		.filter((part) => Number.isFinite(part));

const rotateAround = (angleDegrees: number, cx = 0, cy = 0): Matrix2D => {
	const rad = (angleDegrees * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);

	return multiplyMatrix(
		multiplyMatrix([1, 0, 0, 1, cx, cy], [cos, sin, -sin, cos, 0, 0]),
		[1, 0, 0, 1, -cx, -cy]
	);
};

const parseTransformAttribute = (value: string | null): Matrix2D => {
	if (!value) return IDENTITY_MATRIX;

	const transformPattern = /([a-zA-Z]+)\(([^)]+)\)/g;
	let result = IDENTITY_MATRIX;

	for (const match of value.matchAll(transformPattern)) {
		const fn = match[1].trim();
		const args = parseTransformArguments(match[2]);
		let matrix = IDENTITY_MATRIX;

		switch (fn) {
			case 'matrix':
				if (args.length === 6) {
					matrix = args as Matrix2D;
				}
				break;
			case 'translate':
				matrix = [1, 0, 0, 1, args[0] ?? 0, args[1] ?? 0];
				break;
			case 'scale':
				matrix = [args[0] ?? 1, 0, 0, args[1] ?? args[0] ?? 1, 0, 0];
				break;
			case 'rotate':
				matrix = rotateAround(args[0] ?? 0, args[1] ?? 0, args[2] ?? 0);
				break;
			case 'skewX': {
				const tan = Math.tan(((args[0] ?? 0) * Math.PI) / 180);
				matrix = [1, 0, tan, 1, 0, 0];
				break;
			}
			case 'skewY': {
				const tan = Math.tan(((args[0] ?? 0) * Math.PI) / 180);
				matrix = [1, tan, 0, 1, 0, 0];
				break;
			}
			default:
				break;
		}

		result = multiplyMatrix(matrix, result);
	}

	return result;
};

const getChildElements = (element: Element): Element[] => {
	const childNodes = Array.from(element.childNodes ?? []);
	return childNodes.filter((node): node is Element => node.nodeType === 1);
};

const getStyleProperty = (element: Element, key: string): string | null => {
	const direct = element.getAttribute(key);
	if (direct != null) return direct;

	const styleMap = parseStyleAttribute(element.getAttribute('style'));
	return styleMap[key] ?? null;
};

const readStyleProperties = (element: Element): SvgStyleProperties => {
	const strokeWidth = parseNumber(getStyleProperty(element, 'stroke-width'));
	const opacity = parseNumber(getStyleProperty(element, 'opacity'));

	return {
		id: element.getAttribute('id') ?? undefined,
		class: element.getAttribute('class') ?? undefined,
		fill: getStyleProperty(element, 'fill') ?? undefined,
		stroke: getStyleProperty(element, 'stroke') ?? undefined,
		strokeWidth: strokeWidth ?? undefined,
		opacity: opacity ?? undefined,
		tagName: element.tagName
	};
};

const toMapCoordinate = (
	viewport: SvgViewport,
	matrix: Matrix2D,
	x: number,
	y: number
): [number, number] => {
	const [tx, ty] = applyMatrix(matrix, x, y);
	return [tx, viewport.minY + viewport.height - (ty - viewport.minY)];
};

const ensureClosedRing = (coordinates: [number, number][]): [number, number][] => {
	if (coordinates.length === 0) return coordinates;

	const first = coordinates[0];
	const last = coordinates[coordinates.length - 1];
	if (first[0] === last[0] && first[1] === last[1]) {
		return coordinates;
	}

	return [...coordinates, first];
};

const isClosedPath = (coordinates: [number, number][]): boolean => {
	if (coordinates.length < 3) return false;
	const first = coordinates[0];
	const last = coordinates[coordinates.length - 1];
	return first[0] === last[0] && first[1] === last[1];
};

const parsePointsAttribute = (
	value: string | null,
	viewport: SvgViewport,
	matrix: Matrix2D
): [number, number][] => {
	if (!value) return [];

	const numericValues = value
		.trim()
		.split(/[\s,]+/)
		.map((part) => Number(part))
		.filter((part) => Number.isFinite(part));

	const coordinates: [number, number][] = [];
	for (let i = 0; i + 1 < numericValues.length; i += 2) {
		coordinates.push(toMapCoordinate(viewport, matrix, numericValues[i], numericValues[i + 1]));
	}

	return coordinates;
};

const approximateEllipse = (
	viewport: SvgViewport,
	matrix: Matrix2D,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	segments = 32
): [number, number][] => {
	const coordinates: [number, number][] = [];
	for (let index = 0; index < segments; index += 1) {
		const angle = (Math.PI * 2 * index) / segments;
		const x = cx + Math.cos(angle) * rx;
		const y = cy + Math.sin(angle) * ry;
		coordinates.push(toMapCoordinate(viewport, matrix, x, y));
	}

	return ensureClosedRing(coordinates);
};

const createFeatureCollection = (): FeatureCollection => ({
	type: 'FeatureCollection',
	features: []
});

const pushFeature = (
	featureCollection: FeatureCollection,
	geometryType: GeometryType,
	coordinates:
		| [number, number]
		| [number, number][]
		| [number, number][][]
		| [number, number][][][],
	properties: SvgStyleProperties
) => {
	const geometry = {
		type: geometryType,
		coordinates
	} as AnyGeometry;

	featureCollection.features.push({
		type: 'Feature',
		geometry,
		properties
	});
};

const parsePathElement = (
	element: Element,
	viewport: SvgViewport,
	featureCollection: FeatureCollection,
	matrix: Matrix2D
) => {
	const data = element.getAttribute('d');
	if (!data) return;

	const commands = new SVGPathData(data)
		.toAbs()
		.transform(SVGPathDataTransformer.NORMALIZE_HVZ())
		.transform(SVGPathDataTransformer.NORMALIZE_ST())
		.transform(SVGPathDataTransformer.QT_TO_C())
		.transform(SVGPathDataTransformer.A_TO_C())
		.commands;
	const properties = readStyleProperties(element);
	let currentPath: [number, number][] = [];
	let currentX = 0;
	let currentY = 0;
	let startX = 0;
	let startY = 0;

	const flushPath = (closed: boolean) => {
		if (currentPath.length < 2) {
			currentPath = [];
			return;
		}

		if (closed) {
			pushFeature(featureCollection, 'LineString', ensureClosedRing(currentPath), properties);
		} else {
			pushFeature(featureCollection, 'LineString', currentPath, properties);
		}

		currentPath = [];
	};

	const sampleCubicCurve = (
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		x3: number,
		y3: number,
		segments = 16
	): [number, number][] => {
		const points: [number, number][] = [];
		for (let i = 1; i <= segments; i += 1) {
			const t = i / segments;
			const mt = 1 - t;
			const x = mt * mt * mt * x0
				+ 3 * mt * mt * t * x1
				+ 3 * mt * t * t * x2
				+ t * t * t * x3;
			const y = mt * mt * mt * y0
				+ 3 * mt * mt * t * y1
				+ 3 * mt * t * t * y2
				+ t * t * t * y3;
			points.push(toMapCoordinate(viewport, matrix, x, y));
		}
		return points;
	};

	for (const command of commands) {
		switch (command.type) {
			case SVGPathData.MOVE_TO: {
				if (currentPath.length > 1) {
					flushPath(false);
				}

				currentX = command.x;
				currentY = command.y;
				startX = currentX;
				startY = currentY;
				currentPath = [toMapCoordinate(viewport, matrix, currentX, currentY)];
				break;
			}
			case SVGPathData.LINE_TO: {
				currentX = command.x;
				currentY = command.y;
				currentPath.push(toMapCoordinate(viewport, matrix, currentX, currentY));
				break;
			}
			case SVGPathData.CURVE_TO: {
				const curvePoints = sampleCubicCurve(
					currentX,
					currentY,
					command.x1,
					command.y1,
					command.x2,
					command.y2,
					command.x,
					command.y
				);
				currentPath.push(...curvePoints);
				currentX = command.x;
				currentY = command.y;
				break;
			}
			case SVGPathData.CLOSE_PATH: {
				currentX = startX;
				currentY = startY;
				flushPath(true);
				break;
			}
			default:
				break;
		}
	}

	if (currentPath.length > 1) {
		flushPath(isClosedPath(currentPath));
	}
};

const parseLineElement = (
	element: Element,
	viewport: SvgViewport,
	featureCollection: FeatureCollection,
	matrix: Matrix2D
) => {
	const x1 = parseNumber(element.getAttribute('x1'));
	const y1 = parseNumber(element.getAttribute('y1'));
	const x2 = parseNumber(element.getAttribute('x2'));
	const y2 = parseNumber(element.getAttribute('y2'));
	if (x1 == null || y1 == null || x2 == null || y2 == null) return;

	pushFeature(
		featureCollection,
		'LineString',
		[toMapCoordinate(viewport, matrix, x1, y1), toMapCoordinate(viewport, matrix, x2, y2)],
		readStyleProperties(element)
	);
};

const parsePolylineElement = (
	element: Element,
	viewport: SvgViewport,
	featureCollection: FeatureCollection,
	matrix: Matrix2D
) => {
	const coordinates = parsePointsAttribute(element.getAttribute('points'), viewport, matrix);
	if (coordinates.length < 2) return;

	pushFeature(featureCollection, 'LineString', coordinates, readStyleProperties(element));
};

const parsePolygonElement = (
	element: Element,
	viewport: SvgViewport,
	featureCollection: FeatureCollection,
	matrix: Matrix2D
) => {
	const coordinates = ensureClosedRing(
		parsePointsAttribute(element.getAttribute('points'), viewport, matrix)
	);
	if (coordinates.length < 4) return;

	pushFeature(featureCollection, 'LineString', coordinates, readStyleProperties(element));
};

const parseRectElement = (
	element: Element,
	viewport: SvgViewport,
	featureCollection: FeatureCollection,
	matrix: Matrix2D
) => {
	const x = parseNumber(element.getAttribute('x')) ?? 0;
	const y = parseNumber(element.getAttribute('y')) ?? 0;
	const width = parseNumber(element.getAttribute('width'));
	const height = parseNumber(element.getAttribute('height'));
	if (width == null || height == null || width <= 0 || height <= 0) return;

	const coordinates = ensureClosedRing([
		toMapCoordinate(viewport, matrix, x, y),
		toMapCoordinate(viewport, matrix, x + width, y),
		toMapCoordinate(viewport, matrix, x + width, y + height),
		toMapCoordinate(viewport, matrix, x, y + height)
	]);

	pushFeature(featureCollection, 'LineString', coordinates, readStyleProperties(element));
};

const parseCircleElement = (
	element: Element,
	viewport: SvgViewport,
	featureCollection: FeatureCollection,
	matrix: Matrix2D
) => {
	const cx = parseNumber(element.getAttribute('cx'));
	const cy = parseNumber(element.getAttribute('cy'));
	const radius = parseNumber(element.getAttribute('r'));
	if (cx == null || cy == null || radius == null || radius <= 0) return;

	pushFeature(
		featureCollection,
		'LineString',
		approximateEllipse(viewport, matrix, cx, cy, radius, radius),
		readStyleProperties(element)
	);
};

const parseEllipseElement = (
	element: Element,
	viewport: SvgViewport,
	featureCollection: FeatureCollection,
	matrix: Matrix2D
) => {
	const cx = parseNumber(element.getAttribute('cx'));
	const cy = parseNumber(element.getAttribute('cy'));
	const rx = parseNumber(element.getAttribute('rx'));
	const ry = parseNumber(element.getAttribute('ry'));
	if (cx == null || cy == null || rx == null || ry == null || rx <= 0 || ry <= 0) return;

	pushFeature(
		featureCollection,
		'LineString',
		approximateEllipse(viewport, matrix, cx, cy, rx, ry),
		readStyleProperties(element)
	);
};

export const svgTextToFeatureCollection = async (svgText: string): Promise<FeatureCollection> => {
	const viewport = parseSvgViewport(svgText);
	const document = await parseSvgXmlDocument(svgText);
	const featureCollection = createFeatureCollection();
	const elementParsers: Record<
		string,
		(
			element: Element,
			viewport: SvgViewport,
			featureCollection: FeatureCollection,
			matrix: Matrix2D
		) => void
	> = {
		line: parseLineElement,
		polyline: parsePolylineElement,
		polygon: parsePolygonElement,
		rect: parseRectElement,
		circle: parseCircleElement,
		ellipse: parseEllipseElement,
		path: parsePathElement
	};
	const visit = (element: Element, parentMatrix: Matrix2D) => {
		if (NON_RENDERABLE_CONTAINER_TAGS.has(element.tagName)) {
			return;
		}

		const localMatrix = multiplyMatrix(
			parentMatrix,
			parseTransformAttribute(element.getAttribute('transform'))
		);
		const parser = elementParsers[element.tagName];
		if (parser) {
			parser(element, viewport, featureCollection, localMatrix);
		}

		getChildElements(element).forEach((child) => {
			visit(child, localMatrix);
		});
	};

	const root = document.documentElement;
	if (root) {
		visit(root, IDENTITY_MATRIX);
	}

	return featureCollection;
};

export const svgFileToFeatureCollection = async (file: File): Promise<FeatureCollection> => {
	return svgTextToFeatureCollection(await file.text());
};

const loadImage = async (src: string): Promise<HTMLImageElement> =>
	await new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error('SVG画像の読み込みに失敗しました'));
		image.src = src;
	});

const canvasToPngBlob = async (canvas: HTMLCanvasElement): Promise<Blob> =>
	await new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) {
				resolve(blob);
				return;
			}

			reject(new Error('SVG の PNG 変換に失敗しました'));
		}, 'image/png');
	});

export const rasterizeSvgFile = async (
	file: File
): Promise<{
	width: number;
	height: number;
	bands: RasterBands;
	ranges: BandDataRange[];
	pngFile: File;
}> => {
	const svgText = await file.text();
	const { width, height } = parseSvgDimensions(svgText);
	const objectUrl = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));

	try {
		const image = await loadImage(objectUrl);
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		const context = canvas.getContext('2d');
		if (!context) {
			throw new Error('Canvas context取得失敗');
		}

		context.drawImage(image, 0, 0, width, height);
		const imageData = context.getImageData(0, 0, width, height);
		const pixelCount = width * height;
		const rBand = new Uint8Array(pixelCount);
		const gBand = new Uint8Array(pixelCount);
		const bBand = new Uint8Array(pixelCount);

		for (let i = 0; i < pixelCount; i++) {
			rBand[i] = imageData.data[i * 4];
			gBand[i] = imageData.data[i * 4 + 1];
			bBand[i] = imageData.data[i * 4 + 2];
		}

		const bands: RasterBands = [rBand, gBand, bBand];
		const ranges = bands.map((band) => getMinMax(band, null));
		const pngBlob = await canvasToPngBlob(canvas);
		const pngFile = new File([pngBlob], file.name.replace(/\.svg$/i, '.png'), {
			type: 'image/png'
		});

		return {
			width,
			height,
			bands,
			ranges,
			pngFile
		};
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
};
