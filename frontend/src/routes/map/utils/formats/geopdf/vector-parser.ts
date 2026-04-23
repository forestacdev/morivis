/**
 * GeoPDF Vector Feature Parser
 *
 * Extracts vector geometries (Point, LineString, Polygon, etc.) from
 * PDF content streams by parsing PDF drawing operators.
 *
 * Based on GDAL's pdfreadvectors.cpp implementation.
 *
 * PDF content streams contain operators like:
 *   m (moveTo), l (lineTo), c (curveTo), re (rectangle),
 *   h (closePath), S (stroke), f (fill), etc.
 *
 * These are parsed into GeoJSON-like geometries and optionally
 * transformed to geospatial coordinates using the GeoTransform.
 */

import type { GeoTransform } from './geopdf-parser';

// ============================================================
// Types
// ============================================================

export type GeometryType =
	| 'Point'
	| 'LineString'
	| 'Polygon'
	| 'MultiLineString'
	| 'MultiPolygon'
	| 'MultiPoint';

export interface Geometry {
	type: GeometryType;
	coordinates:
		| [number, number]
		| [number, number][]
		| [number, number][][]
		| [number, number][][][];
}

export interface VectorStyle {
	strokeColor?: [number, number, number]; // RGB 0-255
	fillColor?: [number, number, number]; // RGB 0-255
	lineWidth?: number;
}

export interface VectorFeature {
	geometry: Geometry;
	style: VectorStyle;
	layer?: string;
	/** Marked Content ID (MCID) — StructTreeの属性と紐付け用 */
	mcid?: number;
}

export interface VectorParseOptions {
	/** GeoTransform to convert PDF coords -> geo coords. If omitted, returns PDF page coords. */
	geoTransform?: GeoTransform;
	/** Page width in PDF units (default 612) */
	pageWidth?: number;
	/** Page height in PDF units (default 792) */
	pageHeight?: number;
	/** Whether the GeoTransform has valid Y-flip (default true) */
	geoTransformValid?: boolean;
}

// ============================================================
// Markers in coordinate buffer (matches GDAL)
// ============================================================

const NEW_SUBPATH = -99;
const CLOSE_SUBPATH = -98;
const FILL_SUBPATH = -97;
const BEZIER_STEPS = 10;

// ============================================================
// Graphics State
// ============================================================

interface GraphicState {
	ctm: number[]; // [a, b, c, d, e, f] affine matrix
	strokeColor: [number, number, number];
	fillColor: [number, number, number];
	lineWidth: number;
}

function identityCTM(): number[] {
	return [1, 0, 0, 1, 0, 0];
}

function cloneState(gs: GraphicState): GraphicState {
	return {
		ctm: [...gs.ctm],
		strokeColor: [...gs.strokeColor],
		fillColor: [...gs.fillColor],
		lineWidth: gs.lineWidth
	};
}

/** Pre-multiply: result = matrix * existing CTM */
function preMultiply(ctm: number[], m: number[]): number[] {
	const [a, b, c, d, e, f] = m;
	const [ap, bp, cp, dp, ep, fp] = ctm;
	return [
		a * ap + b * cp,
		a * bp + b * dp,
		c * ap + d * cp,
		c * bp + d * dp,
		e * ap + f * cp + ep,
		e * bp + f * dp + fp
	];
}

function applyMatrix(ctm: number[], x: number, y: number): [number, number] {
	return [x * ctm[0] + y * ctm[2] + ctm[4], x * ctm[1] + y * ctm[3] + ctm[5]];
}

// ============================================================
// Bezier curve approximation
// ============================================================

function addBezierCurve(
	coords: number[],
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	x3: number,
	y3: number
): void {
	for (let i = 1; i < BEZIER_STEPS; i++) {
		const t = i / BEZIER_STEPS;
		const t2 = t * t;
		const t3 = t2 * t;
		const omt = 1 - t;
		const omt2 = omt * omt;
		const omt3 = omt2 * omt;
		const three_t_omt = 3 * t * omt;

		coords.push(omt3 * x0 + three_t_omt * (omt * x1 + t * x2) + t3 * x3);
		coords.push(omt3 * y0 + three_t_omt * (omt * y1 + t * y2) + t3 * y3);
	}
	coords.push(x3);
	coords.push(y3);
}

// ============================================================
// PDF coords -> SRS coords
// ============================================================

function pdfToSRS(x: number, y: number, opts: VectorParseOptions): [number, number] {
	const pw = opts.pageWidth ?? 612;
	const ph = opts.pageHeight ?? 792;
	const gt = opts.geoTransform;

	if (!gt) return [x, y];

	// Normalize to raster pixel coords
	const px = (x / pw) * pw; // in practice this is just x, but keeping the pattern
	const py = opts.geoTransformValid !== false ? (1 - y / ph) * ph : (y / ph) * ph;

	// Apply geotransform
	const geoX = gt.originX + px * gt.pixelWidth + py * gt.rotationX;
	const geoY = gt.originY + px * gt.rotationY + py * gt.pixelHeight;

	return [roundIfClose(geoX), roundIfClose(geoY)];
}

function roundIfClose(v: number): number {
	const r = Math.round(v);
	return Math.abs(v - r) < 1e-8 ? r : v;
}

// ============================================================
// Token parser for PDF content streams
// ============================================================

/**
 * Tokenize a PDF content stream string.
 * Uses regex for high performance on large streams.
 */
function tokenize(content: string): string[] {
	// Match: numbers, operators/keywords, names, strings, dict/array delimiters
	const re = new RegExp(
		'([+-]?(?:\\d+\\.?\\d*|\\.\\d+))' + // numbers
			'|(\\/[^\\s/<>(){}\\[\\]%]+)' + // names /xxx
			'|(\\((?:[^()\\\\]|\\\\.)*\\))' + // string literals (...)
			'|(<[0-9A-Fa-f\\s]*>)' + // hex strings <...>
			'|(<<|>>)' + // dict delimiters
			'|([\\[\\]])' + // array delimiters
			'|([a-zA-Z][a-zA-Z0-9*\'"]*\\*?)', // operators
		'g'
	);
	const tokens: string[] = [];
	let match;
	while ((match = re.exec(content)) !== null) {
		tokens.push(match[0]);
	}
	return tokens;
}

function isNumber(token: string): boolean {
	return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(token);
}

// ============================================================
// Core: Parse content stream into features
// ============================================================

/**
 * Parse a PDF content stream and extract vector features.
 *
 * @param content - The raw content stream text (decoded from the PDF)
 * @param opts - Options for coordinate transformation
 * @returns Array of vector features
 */
export function parseContentStream(
	content: string,
	opts: VectorParseOptions = {}
): VectorFeature[] {
	const tokens = tokenize(content);
	const features: VectorFeature[] = [];

	const stack: string[] = []; // operand stack
	let gs: GraphicState = {
		ctm: identityCTM(),
		strokeColor: [0, 0, 0],
		fillColor: [0, 0, 0],
		lineWidth: 1
	};
	const gsStack: GraphicState[] = [];
	const layerStack: string[] = [];
	let currentLayer: string | undefined;
	const mcidStack: (number | undefined)[] = [];
	let currentMcid: number | undefined;

	let coords: number[] = [];
	let hasFill = false;
	let hasMultiPart = false;

	function emitFeature(): void {
		const geom = buildGeometry(coords, hasFill, hasMultiPart, opts);
		if (geom) {
			features.push({
				geometry: geom,
				style: {
					strokeColor: [
						Math.round(gs.strokeColor[0] * 255),
						Math.round(gs.strokeColor[1] * 255),
						Math.round(gs.strokeColor[2] * 255)
					],
					fillColor: hasFill
						? [
								Math.round(gs.fillColor[0] * 255),
								Math.round(gs.fillColor[1] * 255),
								Math.round(gs.fillColor[2] * 255)
							]
						: undefined,
					lineWidth: gs.lineWidth
				},
				layer: currentLayer,
				mcid: currentMcid
			});
		}
		coords = [];
		hasFill = false;
		hasMultiPart = false;
	}

	function popN(n: number): number[] {
		const result: number[] = [];
		const start = stack.length - n;
		if (start < 0) return result;
		for (let i = start; i < stack.length; i++) {
			result.push(parseFloat(stack[i]) || 0);
		}
		stack.length = start;
		return result;
	}

	for (let ti = 0; ti < tokens.length; ti++) {
		const tok = tokens[ti];

		// Numbers and names go on the stack
		if (isNumber(tok)) {
			stack.push(tok);
			continue;
		}

		// Names (for BDC/BMC)
		if (tok.startsWith('/') || tok.startsWith('(') || tok === '<<' || tok === '[') {
			stack.push(tok);
			// Skip inline dict/array content
			if (tok === '<<') {
				let depth = 1;
				while (ti + 1 < tokens.length && depth > 0) {
					ti++;
					if (tokens[ti] === '<<') depth++;
					else if (tokens[ti] === '>>') depth--;
					stack.push(tokens[ti]);
				}
			}
			if (tok === '[') {
				let depth = 1;
				while (ti + 1 < tokens.length && depth > 0) {
					ti++;
					if (tokens[ti] === '[') depth++;
					else if (tokens[ti] === ']') depth--;
					stack.push(tokens[ti]);
				}
			}
			continue;
		}

		// Operators
		let emit = false;

		switch (tok) {
			// === Graphics state ===
			case 'q':
				gsStack.push(cloneState(gs));
				break;

			case 'Q':
				if (gsStack.length > 0) {
					gs = gsStack.pop()!;
				}
				break;

			case 'cm': {
				const args = popN(6);
				if (args.length === 6) {
					gs.ctm = preMultiply(gs.ctm, args);
				}
				break;
			}

			// === Color ===
			case 'RG': {
				// stroke color (RGB)
				const args = popN(3);
				if (args.length === 3) gs.strokeColor = [args[0], args[1], args[2]];
				break;
			}
			case 'rg': {
				// fill color (RGB)
				const args = popN(3);
				if (args.length === 3) gs.fillColor = [args[0], args[1], args[2]];
				break;
			}
			case 'G': {
				// stroke gray
				const args = popN(1);
				if (args.length === 1) gs.strokeColor = [args[0], args[0], args[0]];
				break;
			}
			case 'g': {
				// fill gray
				const args = popN(1);
				if (args.length === 1) gs.fillColor = [args[0], args[0], args[0]];
				break;
			}
			case 'K': {
				// stroke CMYK (approximate to RGB)
				const args = popN(4);
				if (args.length === 4) {
					const [c, m, y, k] = args;
					gs.strokeColor = [(1 - c) * (1 - k), (1 - m) * (1 - k), (1 - y) * (1 - k)];
				}
				break;
			}
			case 'k': {
				// fill CMYK
				const args = popN(4);
				if (args.length === 4) {
					const [c, m, y, k] = args;
					gs.fillColor = [(1 - c) * (1 - k), (1 - m) * (1 - k), (1 - y) * (1 - k)];
				}
				break;
			}

			case 'w': {
				// line width
				const args = popN(1);
				if (args.length === 1) gs.lineWidth = args[0];
				break;
			}

			// === Path construction ===
			case 'm': {
				// moveTo
				const args = popN(2);
				if (args.length === 2) {
					if (coords.length > 0) hasMultiPart = true;
					coords.push(NEW_SUBPATH, NEW_SUBPATH);
					const [tx, ty] = applyMatrix(gs.ctm, args[0], args[1]);
					coords.push(tx, ty);
				}
				break;
			}

			case 'l': {
				// lineTo
				const args = popN(2);
				if (args.length === 2) {
					const [tx, ty] = applyMatrix(gs.ctm, args[0], args[1]);
					coords.push(tx, ty);
				}
				break;
			}

			case 'c': {
				// cubic Bezier (3 control points)
				const args = popN(6);
				if (args.length === 6) {
					const [x1, y1] = applyMatrix(gs.ctm, args[0], args[1]);
					const [x2, y2] = applyMatrix(gs.ctm, args[2], args[3]);
					const [x3, y3] = applyMatrix(gs.ctm, args[4], args[5]);
					const prevX = coords.length >= 2 ? coords[coords.length - 2] : x1;
					const prevY = coords.length >= 2 ? coords[coords.length - 1] : y1;
					addBezierCurve(coords, prevX, prevY, x1, y1, x2, y2, x3, y3);
				}
				break;
			}

			case 'v': {
				// Bezier: first control point = current point
				const args = popN(4);
				if (args.length === 4) {
					const [x2, y2] = applyMatrix(gs.ctm, args[0], args[1]);
					const [x3, y3] = applyMatrix(gs.ctm, args[2], args[3]);
					const prevX = coords.length >= 2 ? coords[coords.length - 2] : x2;
					const prevY = coords.length >= 2 ? coords[coords.length - 1] : y2;
					addBezierCurve(coords, prevX, prevY, prevX, prevY, x2, y2, x3, y3);
				}
				break;
			}

			case 'y': {
				// Bezier: last control point = end point
				const args = popN(4);
				if (args.length === 4) {
					const [x1, y1] = applyMatrix(gs.ctm, args[0], args[1]);
					const [x3, y3] = applyMatrix(gs.ctm, args[2], args[3]);
					const prevX = coords.length >= 2 ? coords[coords.length - 2] : x1;
					const prevY = coords.length >= 2 ? coords[coords.length - 1] : y1;
					addBezierCurve(coords, prevX, prevY, x1, y1, x3, y3, x3, y3);
				}
				break;
			}

			case 're': {
				// Rectangle
				const args = popN(4);
				if (args.length === 4) {
					const x = args[0];
					const y = args[1];
					const w = args[2];
					const h = args[3];

					const [x1, y1] = applyMatrix(gs.ctm, x, y);
					const [x2, y2] = applyMatrix(gs.ctm, x + w, y + h);

					if (coords.length > 0) hasMultiPart = true;
					coords.push(NEW_SUBPATH, NEW_SUBPATH);
					coords.push(x1, y1);
					coords.push(x2, y1);
					coords.push(x2, y2);
					coords.push(x1, y2);
					coords.push(CLOSE_SUBPATH, CLOSE_SUBPATH);
				}
				break;
			}

			// === Path closing/painting ===
			case 'h':
				// close subpath
				if (
					!(
						coords.length >= 2 &&
						coords[coords.length - 2] === CLOSE_SUBPATH &&
						coords[coords.length - 1] === CLOSE_SUBPATH
					)
				) {
					coords.push(CLOSE_SUBPATH, CLOSE_SUBPATH);
				}
				break;

			case 'n':
				// end path without painting
				coords = [];
				break;

			case 'S':
				// stroke
				emit = true;
				break;

			case 's':
				// close + stroke
				if (
					!(
						coords.length >= 2 &&
						coords[coords.length - 2] === CLOSE_SUBPATH &&
						coords[coords.length - 1] === CLOSE_SUBPATH
					)
				) {
					coords.push(CLOSE_SUBPATH, CLOSE_SUBPATH);
				}
				emit = true;
				break;

			case 'f':
			case 'F':
			case 'f*':
			case 'B':
			case 'B*':
				// fill (and optionally stroke)
				coords.push(FILL_SUBPATH, FILL_SUBPATH);
				hasFill = true;
				emit = true;
				break;

			case 'b':
			case 'b*':
				// close + fill + stroke
				if (
					!(
						coords.length >= 2 &&
						coords[coords.length - 2] === CLOSE_SUBPATH &&
						coords[coords.length - 1] === CLOSE_SUBPATH
					)
				) {
					coords.push(CLOSE_SUBPATH, CLOSE_SUBPATH);
				}
				coords.push(FILL_SUBPATH, FILL_SUBPATH);
				hasFill = true;
				emit = true;
				break;

			// === Marked content (layers + MCID) ===
			case 'BDC': {
				// Stack has: /Tag <props or /name or <<...>>>
				// Pattern 1: /OC /LayerName BDC → layer
				// Pattern 2: /feature <</MCID N>> BDC → MCID
				layerStack.push(currentLayer ?? '');
				mcidStack.push(currentMcid);

				// Find tag and props in stack
				// Props might be inline dict tokens: << /MCID 0 >>
				const bdcTokens = stack.splice(0);
				const tagToken = bdcTokens.find((t) => t.startsWith('/'));

				if (tagToken === '/OC') {
					const nameToken = bdcTokens.find((t) => t.startsWith('/') && t !== '/OC');
					if (nameToken) currentLayer = nameToken.slice(1);
				} else if (tagToken === '/feature') {
					// Extract MCID from inline dict: << /MCID N >>
					const mcidIdx = bdcTokens.indexOf('/MCID');
					if (mcidIdx >= 0 && mcidIdx + 1 < bdcTokens.length) {
						const mcidVal = parseInt(bdcTokens[mcidIdx + 1]);
						if (!isNaN(mcidVal)) currentMcid = mcidVal;
					}
				}
				break;
			}

			case 'BMC': {
				layerStack.push(currentLayer ?? '');
				mcidStack.push(currentMcid);
				stack.length = Math.max(0, stack.length - 1);
				break;
			}

			case 'EMC':
				if (layerStack.length > 0) {
					currentLayer = layerStack.pop() || undefined;
				}
				if (mcidStack.length > 0) {
					currentMcid = mcidStack.pop();
				}
				break;

			// === Text and other operators: consume args and skip ===
			default: {
				// Known operators with fixed arg counts - just pop args
				const argCounts: Record<string, number> = {
					d: 1,
					i: 1,
					j: 1,
					J: 1,
					M: 1,
					ri: 1,
					gs: 1,
					CS: 1,
					cs: 1,
					SC: -1,
					sc: -1,
					SCN: -1,
					scn: -1,
					sh: 1,
					Do: 1,
					Tc: 1,
					Td: 2,
					TD: 2,
					Tf: 1,
					Tj: 1,
					TJ: 1,
					TL: 1,
					Tm: 6,
					Tr: 1,
					Ts: 1,
					Tw: 1,
					Tz: 1,
					W: 0,
					'W*': 0,
					BT: 0,
					ET: 0,
					BX: 0,
					EX: 0,
					DP: 2,
					MP: 1
				};
				const n = argCounts[tok];
				if (n !== undefined) {
					if (n === -1) {
						// Variable args: pop all remaining numbers
						while (stack.length > 0 && isNumber(stack[stack.length - 1])) {
							stack.pop();
						}
					} else if (n > 0) {
						stack.length = Math.max(0, stack.length - n);
					}
				}
				// else: unknown token pushed as operand or ignored
				break;
			}
		}

		if (emit) {
			emitFeature();
		}
	}

	return features;
}

// ============================================================
// Build geometry from coordinate buffer
// ============================================================

/** ポイントマーカーとみなすPDF座標上の面積閾値 */
const POINT_MARKER_AREA_THRESHOLD = 500; // ~22x22 pt

/**
 * 座標バッファのバウンディングボックス面積を計算（マーカー検出用）
 * NEW_SUBPATH/CLOSE_SUBPATH/FILL_SUBPATHはスキップ
 */
function coordsBboxArea(coords: number[]): number {
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;
	let pointCount = 0;
	for (let i = 0; i < coords.length; i += 2) {
		if (coords[i] === NEW_SUBPATH || coords[i] === CLOSE_SUBPATH || coords[i] === FILL_SUBPATH)
			continue;
		if (coords[i] < minX) minX = coords[i];
		if (coords[i] > maxX) maxX = coords[i];
		if (coords[i + 1] < minY) minY = coords[i + 1];
		if (coords[i + 1] > maxY) maxY = coords[i + 1];
		pointCount++;
	}
	if (pointCount < 2) return 0;
	return (maxX - minX) * (maxY - minY);
}

/**
 * 座標バッファのバウンディングボックス中心を計算（重心よりも正確）
 */
function coordsCentroid(coords: number[]): [number, number] {
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;
	for (let i = 0; i < coords.length; i += 2) {
		if (coords[i] === NEW_SUBPATH || coords[i] === CLOSE_SUBPATH || coords[i] === FILL_SUBPATH)
			continue;
		if (coords[i] < minX) minX = coords[i];
		if (coords[i] > maxX) maxX = coords[i];
		if (coords[i + 1] < minY) minY = coords[i + 1];
		if (coords[i + 1] > maxY) maxY = coords[i + 1];
	}
	return Number.isFinite(minX) ? [(minX + maxX) / 2, (minY + maxY) / 2] : [0, 0];
}

function buildGeometry(
	coords: number[],
	hasFill: boolean,
	hasMultiPart: boolean,
	opts: VectorParseOptions
): Geometry | null {
	if (coords.length === 0) return null;

	// Single point
	if (coords.length === 2) {
		const [x, y] = pdfToSRS(coords[0], coords[1], opts);
		return { type: 'Point', coordinates: [x, y] };
	}

	// 小さなポリゴン（マーカー）をPointとして扱う
	const area = coordsBboxArea(coords);
	if (area > 0 && area < POINT_MARKER_AREA_THRESHOLD) {
		const [cx, cy] = coordsCentroid(coords);
		const [x, y] = pdfToSRS(cx, cy, opts);
		return { type: 'Point', coordinates: [x, y] };
	}

	if (!hasFill) {
		// Stroke only -> LineString / MultiLineString
		return buildLineGeometry(coords, hasMultiPart, opts);
	} else {
		// Fill -> Polygon / MultiPolygon
		return buildPolygonGeometry(coords, opts);
	}
}

function buildLineGeometry(
	coords: number[],
	hasMultiPart: boolean,
	opts: VectorParseOptions
): Geometry | null {
	const lines: [number, number][][] = [];
	let currentLine: [number, number][] = [];

	for (let i = 0; i < coords.length; i += 2) {
		if (coords[i] === NEW_SUBPATH && coords[i + 1] === NEW_SUBPATH) {
			if (currentLine.length > 0) {
				lines.push(currentLine);
			}
			currentLine = [];
		} else if (coords[i] === CLOSE_SUBPATH && coords[i + 1] === CLOSE_SUBPATH) {
			// Close: add first point to end if not already closed
			if (
				currentLine.length >= 2 &&
				(currentLine[0][0] !== currentLine[currentLine.length - 1][0] ||
					currentLine[0][1] !== currentLine[currentLine.length - 1][1])
			) {
				currentLine.push(currentLine[0]);
			}
		} else if (coords[i] === FILL_SUBPATH && coords[i + 1] === FILL_SUBPATH) {
			// skip
		} else {
			const [x, y] = pdfToSRS(coords[i], coords[i + 1], opts);
			currentLine.push([x, y]);
		}
	}
	if (currentLine.length > 0) {
		lines.push(currentLine);
	}

	if (lines.length === 0) return null;

	if (lines.length === 1) {
		if (lines[0].length === 1) {
			return { type: 'Point', coordinates: lines[0][0] };
		}
		return { type: 'LineString', coordinates: lines[0] };
	}

	return { type: 'MultiLineString', coordinates: lines };
}

function buildPolygonGeometry(coords: number[], opts: VectorParseOptions): Geometry | null {
	const rings: [number, number][][] = [];
	let currentRing: [number, number][] = [];

	for (let i = 0; i < coords.length; i += 2) {
		if (coords[i] === NEW_SUBPATH && coords[i + 1] === NEW_SUBPATH) {
			if (currentRing.length >= 3) {
				// Close ring
				if (
					currentRing[0][0] !== currentRing[currentRing.length - 1][0] ||
					currentRing[0][1] !== currentRing[currentRing.length - 1][1]
				) {
					currentRing.push([...currentRing[0]]);
				}
				rings.push(currentRing);
			}
			currentRing = [];
		} else if (
			(coords[i] === CLOSE_SUBPATH && coords[i + 1] === CLOSE_SUBPATH) ||
			(coords[i] === FILL_SUBPATH && coords[i + 1] === FILL_SUBPATH)
		) {
			if (currentRing.length >= 3) {
				// Close ring
				if (
					currentRing[0][0] !== currentRing[currentRing.length - 1][0] ||
					currentRing[0][1] !== currentRing[currentRing.length - 1][1]
				) {
					currentRing.push([...currentRing[0]]);
				}
				rings.push(currentRing);
				currentRing = [];
			}
		} else {
			const [x, y] = pdfToSRS(coords[i], coords[i + 1], opts);
			currentRing.push([x, y]);
		}
	}

	if (currentRing.length >= 3) {
		if (
			currentRing[0][0] !== currentRing[currentRing.length - 1][0] ||
			currentRing[0][1] !== currentRing[currentRing.length - 1][1]
		) {
			currentRing.push([...currentRing[0]]);
		}
		rings.push(currentRing);
	}

	if (rings.length === 0) return null;

	if (rings.length === 1) {
		return { type: 'Polygon', coordinates: [rings[0]] };
	}

	// Simple approach: first ring = exterior, rest = holes of that polygon
	// (GDAL uses OGRGeometryFactory::organizePolygons for proper hole detection)
	// For a more robust implementation, check winding order.
	const polygons = organizePolygons(rings);

	if (polygons.length === 1) {
		return { type: 'Polygon', coordinates: polygons[0] };
	}

	return { type: 'MultiPolygon', coordinates: polygons };
}

/**
 * Simple polygon organization: determine which rings are exterior
 * and which are holes based on signed area (winding order).
 *
 * CCW = exterior, CW = hole (or vice versa depending on coord system).
 * For simplicity, uses containment check: if a ring is inside another,
 * it's a hole.
 */
function organizePolygons(rings: [number, number][][]): [number, number][][][] {
	if (rings.length <= 1) {
		return [rings];
	}

	// Compute signed areas
	const areas = rings.map(signedArea);

	// Rings with positive area (CCW in screen coords) are exterior
	// Rings with negative area (CW) are holes
	const exteriors: { ring: [number, number][]; holes: [number, number][][] }[] = [];

	for (let i = 0; i < rings.length; i++) {
		if (Math.abs(areas[i]) < 1e-10) continue;

		if (areas[i] > 0) {
			// Exterior ring (or just treat larger area as exterior)
			exteriors.push({ ring: rings[i], holes: [] });
		}
	}

	// If no positive-area rings, all are exterior
	if (exteriors.length === 0) {
		return rings.map((r) => [r]);
	}

	// Assign negative-area (hole) rings to their containing exterior
	for (let i = 0; i < rings.length; i++) {
		if (areas[i] >= 0) continue;

		// Find which exterior contains this hole
		const pt = rings[i][0];
		let assigned = false;
		for (const ext of exteriors) {
			if (pointInRing(pt, ext.ring)) {
				ext.holes.push(rings[i]);
				assigned = true;
				break;
			}
		}
		if (!assigned && exteriors.length > 0) {
			// Default to first exterior
			exteriors[0].holes.push(rings[i]);
		}
	}

	return exteriors.map((e) => [e.ring, ...e.holes]);
}

function signedArea(ring: [number, number][]): number {
	let sum = 0;
	for (let i = 0; i < ring.length - 1; i++) {
		sum += (ring[i + 1][0] - ring[i][0]) * (ring[i + 1][1] + ring[i][1]);
	}
	return sum / 2;
}

function pointInRing(pt: [number, number], ring: [number, number][]): boolean {
	let inside = false;
	const [px, py] = pt;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
			inside = !inside;
		}
	}
	return inside;
}
