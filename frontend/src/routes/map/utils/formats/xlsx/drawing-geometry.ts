import { DOMParser } from '@xmldom/xmldom';

import type { FeatureCollection } from '$routes/map/types/geojson';
import { svgTextToFeatureCollection } from '$routes/map/utils/formats/svg';

export const children = (node: Element | undefined, name?: string): Element[] =>
	Array.from(node?.childNodes ?? []).filter((item): item is Element =>
		item.nodeType === 1 && (!name || (item as Element).localName === name)
	);
export const child = (node: Element | undefined, name: string): Element | undefined =>
	children(node, name)[0];

export const parseXml = (text: string): Element => {
	// XLSX parts do not need a DTD. Reject it before passing XML to the parser.
	if (/<!DOCTYPE/i.test(text)) throw new Error('ExcelのXMLに未対応のDTDが含まれています');
	const doc = new DOMParser({
		errorHandler: {
			warning: () => {},
			error: () => {
				throw new Error('ExcelのXMLが不正です');
			},
			fatalError: () => {
				throw new Error('ExcelのXMLが不正です');
			}
		}
	}).parseFromString(text, 'text/xml');
	if (!doc.documentElement) throw new Error('ExcelのXMLが空です');
	return doc.documentElement;
};

export const number = (node: Element | undefined, key: string, fallback = 0): number => {
	const value = node?.getAttribute(key);
	if (!value) return fallback;
	const result = Number(value);
	if (!Number.isFinite(result)) throw new Error('未対応の図形座標');
	return result;
};
const textNumber = (node: Element | undefined, name: string): number => {
	const result = Number(child(node, name)?.textContent ?? 0);
	if (!Number.isFinite(result)) throw new Error('不正なアンカー座標');
	return result;
};

export type Box = { x: number; y: number; width: number; height: number; };
export const EMU_PER_PIXEL = 9525;

// Cell anchors are used when the drawing has no explicit xfrm position/extent.
const markerPosition = (marker: Element | undefined, sheet?: Element) => {
	const col = textNumber(marker, 'col');
	const row = textNumber(marker, 'row');
	if (
		!Number.isInteger(col) || col < 0 || col > 16383
		|| !Number.isInteger(row) || row < 0 || row > 1048575
	) {
		throw new Error('不正なアンカー座標');
	}
	const format = child(sheet, 'sheetFormatPr');
	const columnPixels = (width: number) =>
		width < 1 ? Math.floor(width * 12 + 0.5) : Math.floor(width * 7 + 0.5) + 5;
	const defaultColumn = columnPixels(number(format, 'defaultColWidth', 8.43));
	let x = col * defaultColumn;
	for (const column of children(child(sheet, 'cols'), 'col')) {
		const count = Math.max(
			0,
			Math.min(col, number(column, 'max')) - Math.max(0, number(column, 'min') - 1)
		);
		const width = column.getAttribute('hidden') === '1'
			? 0
			: columnPixels(number(column, 'width', 8.43));
		x += count * (width - defaultColumn);
	}
	const defaultRow = number(format, 'defaultRowHeight', 15) * 96 / 72;
	let y = row * defaultRow;
	for (const item of children(child(sheet, 'sheetData'), 'row')) {
		const index = number(item, 'r');
		if (index <= 0 || index > row) continue;
		const height = item.getAttribute('hidden') === '1'
			? 0
			: number(item, 'ht', defaultRow * 72 / 96) * 96 / 72;
		y += height - defaultRow;
	}
	return {
		x: x * EMU_PER_PIXEL + textNumber(marker, 'colOff'),
		y: y * EMU_PER_PIXEL + textNumber(marker, 'rowOff')
	};
};

export const anchorBox = (anchor: Element, sheet?: Element): Box => {
	const from = child(anchor, 'pos')
		? { x: number(child(anchor, 'pos'), 'x'), y: number(child(anchor, 'pos'), 'y') }
		: markerPosition(child(anchor, 'from'), sheet);
	const to = child(anchor, 'to') ? markerPosition(child(anchor, 'to'), sheet) : null;
	return {
		...from,
		width: to ? to.x - from.x : number(child(anchor, 'ext'), 'cx'),
		height: to ? to.y - from.y : number(child(anchor, 'ext'), 'cy')
	};
};

export const readBox = (transform: Element | undefined, fallback: () => Box): Box => {
	const offset = child(transform, 'off');
	const extent = child(transform, 'ext');
	const base = !offset || !extent ? fallback() : { x: 0, y: 0, width: 0, height: 0 };
	return {
		x: number(offset, 'x', base.x),
		y: number(offset, 'y', base.y),
		width: number(extent, 'cx', base.width),
		height: number(extent, 'cy', base.height)
	};
};

// One matrix avoids depending on SVG transform-list ordering. Flip, then rotate
// around the bounding-box center, then place the shape in its parent coordinates.
export const matrix = (transform: Element | undefined, box: Box, group = false): string => {
	const angle = number(transform, 'rot') / 60000 * Math.PI / 180;
	const flip = (key: string) =>
		['1', 'true'].includes(transform?.getAttribute(key) ?? '') ? -1 : 1;
	const sx = flip('flipH');
	const sy = flip('flipV');
	const childExtent = child(transform, 'chExt');
	const childOffset = child(transform, 'chOff');
	const scaleX = group ? box.width / number(childExtent, 'cx', box.width) : 1;
	const scaleY = group ? box.height / number(childExtent, 'cy', box.height) : 1;
	const a = Math.cos(angle) * sx;
	const b = Math.sin(angle) * sx;
	const c = -Math.sin(angle) * sy;
	const d = Math.cos(angle) * sy;
	const ox = group ? number(childOffset, 'x') : 0;
	const oy = group ? number(childOffset, 'y') : 0;
	const e = box.x + box.width / 2 - a * box.width / 2 - c * box.height / 2 - a * scaleX * ox
		- c * scaleY * oy;
	const f = box.y + box.height / 2 - b * box.width / 2 - d * box.height / 2 - b * scaleX * ox
		- d * scaleY * oy;
	const values = [a * scaleX, b * scaleX, c * scaleY, d * scaleY, e, f];
	if (!values.every(Number.isFinite)) throw new Error('不正なグループ座標');
	return `matrix(${values.join(' ')})`;
};

export const customPaths = (geometry: Element, box: Box, id: string): string => {
	return children(child(geometry, 'pathLst'), 'path').map((path) => {
		const width = number(path, 'w', box.width);
		const height = number(path, 'h', box.height);
		if (width < 0 || height < 0 || (!width && box.width) || (!height && box.height)) {
			throw new Error('不正なパスサイズ');
		}
		const commands = children(path).map((command) => {
			if (command.localName === 'close') return 'Z';
			const kind = {
				moveTo: ['M', 1],
				lnTo: ['L', 1],
				cubicBezTo: ['C', 3],
				quadBezTo: ['Q', 2]
			}[command.localName];
			const points = children(command, 'pt');
			if (!kind || points.length !== kind[1]) throw new Error('未対応のパス命令');
			return `${kind[0]} ${
				points.map((point) =>
					`${number(point, 'x') * box.width / (width || 1)} ${
						number(point, 'y') * box.height / (height || 1)
					}`
				).join(' ')
			}`;
		});
		const fill = path.getAttribute('fill') === 'none' ? ' fill="none"' : '';
		const stroke = ['0', 'false'].includes(path.getAttribute('stroke') ?? '')
			? ' stroke="none"'
			: '';
		return `<path id="${id}"${fill}${stroke} d="${commands.join(' ')}"/>`;
	}).join('');
};

export const presetGeometry = (preset: string, box: Box, id: string): string => {
	const { width: w, height: h } = box;
	const attrs = `id="${id}"`;
	switch (preset) {
		case 'rect':
			return `<rect ${attrs} width="${w}" height="${h}"/>`;
		case 'line':
		case 'straightConnector1':
			return `<line ${attrs} x1="0" y1="0" x2="${w}" y2="${h}"/>`;
		case 'ellipse':
			return `<ellipse ${attrs} cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}"/>`;
		case 'triangle':
			return `<polygon ${attrs} points="${w / 2},0 ${w},${h} 0,${h}"/>`;
		case 'rtTriangle':
			return `<polygon ${attrs} points="0,0 ${w},${h} 0,${h}"/>`;
		case 'diamond':
			return `<polygon ${attrs} points="${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}"/>`;
		default:
			throw new Error(`未対応の図形: ${preset}`);
	}
};

export interface XlsxDrawing {
	featureCollection: FeatureCollection;
	shapeCount: number;
	skippedShapeCount: number;
	imageCount: number;
}

/** DrawingML shapes become editable line features in local pixel coordinates (Y up). */
export const drawingXmlToGeojson = async (xml: string, sheetXml?: string): Promise<XlsxDrawing> => {
	const root = parseXml(xml);
	const sheet = sheetXml ? parseXml(sheetXml) : undefined;
	const metadata = new Map<string, { name: string; text: string; }>();
	let skippedShapeCount = 0;
	let imageCount = 0;
	let nextId = 0;
	const visit = (element: Element, fallback: () => Box): string => {
		const tag = element.localName;
		if (tag === 'pic') {
			imageCount++;
			return '';
		}
		if (!['sp', 'cxnSp', 'grpSp'].includes(tag)) return '';
		try {
			const group = tag === 'grpSp';
			const props = child(element, group ? 'grpSpPr' : 'spPr');
			const transform = child(props, 'xfrm');
			const box = readBox(transform, fallback);
			if (box.width < 0 || box.height < 0) throw new Error('不正な図形サイズ');
			const transformValue = matrix(transform, box, group);
			if (group) {
				return `<g transform="${transformValue}">${
					children(element).map((item) =>
						visit(item, () => {
							throw new Error('グループ内の図形位置がありません');
						})
					).join('')
				}</g>`;
			}
			const id = `shape-${nextId++}`;
			const geometry = child(props, 'custGeom');
			const svg = geometry
				? customPaths(geometry, box, id)
				: presetGeometry(child(props, 'prstGeom')?.getAttribute('prst') ?? '', box, id);
			const nonVisual = child(element, tag === 'cxnSp' ? 'nvCxnSpPr' : 'nvSpPr');
			metadata.set(id, {
				name: child(nonVisual, 'cNvPr')?.getAttribute('name') ?? '',
				text: Array.from(element.getElementsByTagNameNS('*', 't')).map((item) =>
					item.textContent ?? ''
				).join('')
			});
			return `<g transform="${transformValue}">${svg}</g>`;
		} catch {
			skippedShapeCount++;
			return '';
		}
	};
	const svg = children(root).map((anchor) =>
		children(anchor).map((item) => visit(item, () => anchorBox(anchor, sheet))).join('')
	).join('');
	const featureCollection = await svgTextToFeatureCollection(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><g transform="matrix(${
			1 / EMU_PER_PIXEL
		} 0 0 ${1 / EMU_PER_PIXEL} 0 0)">${svg}</g></svg>`
	);
	const shapeIds = new Set<string>();
	for (const feature of featureCollection.features) {
		const id = String(feature.properties?.id ?? '');
		shapeIds.add(id);
		feature.properties = { ...metadata.get(id), shapeId: id };
		// The SVG reader inverts Y around its viewport height. Remove that origin offset.
		if (feature.geometry.type === 'LineString') {
			feature.geometry.coordinates = (feature.geometry.coordinates as number[][]).map((
				point
			) => [point[0], point[1] - 1]);
		}
	}
	return { featureCollection, shapeCount: shapeIds.size, skippedShapeCount, imageCount };
};
