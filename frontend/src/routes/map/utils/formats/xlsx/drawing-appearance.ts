import {
	anchorBox,
	type Box,
	child,
	children,
	customPaths,
	EMU_PER_PIXEL,
	matrix,
	number,
	parseXml,
	presetGeometry,
	readBox
} from './drawing-geometry';
import { transformDrawingOutline } from './drawing-path';
import { escapeXml, readDrawingTheme, shapePaint } from './drawing-style';
import { renderDrawingText } from './drawing-text';

export interface XlsxDrawingAppearance {
	svg: string;
	width: number;
	height: number;
	shapeCount: number;
	imageCount: number;
	skippedImageCount: number;
	warnings: string[];
}

export interface DrawingResources {
	themeXml?: string;
	/** Only validated embedded raster data URLs, keyed by drawing relationship ID. */
	images?: ReadonlyMap<string, string>;
}

type Matrix = number[];
const multiply = (parent: Matrix, local: Matrix): Matrix => {
	const [a, b, c, d, e, f] = parent;
	const [g, h, i, j, k, l] = local;
	return [
		a * g + c * h,
		b * g + d * h,
		a * i + c * j,
		b * i + d * j,
		a * k + c * l + e,
		b * k + d * l + f
	];
};

/** Construct SVG from allowlisted primitives, never copy input XML into markup. */
export const drawingXmlToAppearance = (
	xml: string,
	sheetXml?: string,
	resources: DrawingResources = {}
): XlsxDrawingAppearance => {
	const root = parseXml(xml);
	const sheet = sheetXml ? parseXml(sheetXml) : undefined;
	const theme = readDrawingTheme(resources.themeXml);
	const warnings = new Set<string>();
	const bounds = [Infinity, Infinity, -Infinity, -Infinity];
	let shapeCount = 0;
	let imageCount = 0;
	let skippedImageCount = 0;
	let id = 0;
	const includeBox = (box: Box, transform: Matrix, padding: number) => {
		// Expand after transforming: padding and line widths are EMUs, not group units.
		for (const [x, y] of [[0, 0], [box.width, 0], [box.width, box.height], [0, box.height]]) {
			const px = transform[0] * x + transform[2] * y + transform[4];
			const py = transform[1] * x + transform[3] * y + transform[5];
			bounds[0] = Math.min(bounds[0], px - padding);
			bounds[1] = Math.min(bounds[1], py - padding);
			bounds[2] = Math.max(bounds[2], px + padding);
			bounds[3] = Math.max(bounds[3], py + padding);
		}
	};
	const visit = (element: Element, fallback: () => Box, parent: Matrix): string => {
		const tag = element.localName;
		if (!['sp', 'cxnSp', 'grpSp', 'pic'].includes(tag)) {
			if (tag === 'graphicFrame') warnings.add('グラフ・SmartArtは未対応です。');
			return '';
		}
		try {
			const group = tag === 'grpSp';
			const props = child(element, group ? 'grpSpPr' : 'spPr');
			const transform = child(props, 'xfrm');
			const box = readBox(transform, fallback);
			if (box.width < 0 || box.height < 0) throw new Error('size');
			const transformText = matrix(transform, box, group);
			const combined = multiply(parent, transformText.slice(7, -1).split(' ').map(Number));
			if (group) {
				return `${
					children(element).map((item) =>
						visit(item, () => {
							throw new Error('position');
						}, combined)
					).join('')
				}`;
			}
			let content = '';
			if (tag === 'pic') {
				const fill = child(element, 'blipFill');
				const blip = child(fill, 'blip');
				const relation = Array.from(blip?.attributes ?? []).find((attr) =>
					attr.localName === 'embed'
				)?.value;
				const url = relation ? resources.images?.get(relation) : undefined;
				if (!url || !/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(url)) {
					throw new Error('image');
				}
				if (child(fill, 'tile')) throw new Error('tile');
				const crop = child(fill, 'srcRect');
				const left = number(crop, 'l') / 100000;
				const top = number(crop, 't') / 100000;
				const width = 1 - left - number(crop, 'r') / 100000;
				const height = 1 - top - number(crop, 'b') / 100000;
				if (width <= 0 || height <= 0 || box.width <= 0 || box.height <= 0) {
					throw new Error('crop');
				}
				const opacity = Math.max(
					0,
					Math.min(1, number(child(blip, 'alphaModFix'), 'amt', 100000) / 100000)
				);
				content =
					`<svg width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}" overflow="hidden"><image x="${
						-left * box.width / width
					}" y="${-top * box.height / height}" width="${box.width / width}" height="${
						box.height / height
					}" preserveAspectRatio="none" opacity="${opacity}" href="${
						escapeXml(url)
					}"/></svg>`;
				content = `<g transform="matrix(${combined.join(' ')})">${content}</g>`;
				imageCount++;
			} else {
				const geometry = child(props, 'custGeom');
				try {
					content = geometry
						? customPaths(geometry, box, `drawing-${id++}`)
						: presetGeometry(
							child(props, 'prstGeom')?.getAttribute('prst') ?? 'rect',
							box,
							`drawing-${id++}`
						);
				} catch {
					warnings.add('未対応の図形は輪郭と塗りを省略しています。');
				}
				const text = renderDrawingText(element, box, theme, warnings);
				if (!content && !text) return '';
				content = `<g ${shapePaint(element, theme, warnings)}>${
					transformDrawingOutline(content, combined)
				}</g><g transform="matrix(${combined.join(' ')})">${text}</g>`;
				shapeCount++;
			}
			includeBox(
				box,
				combined,
				Math.max(EMU_PER_PIXEL * 2, number(child(props, 'ln'), 'w', EMU_PER_PIXEL) / 2)
			);
			return content;
		} catch {
			if (tag === 'pic') skippedImageCount++;
			else warnings.add('位置やサイズを解釈できない図形を省略しています。');
			return '';
		}
	};
	const content = children(root).map((anchor) =>
		children(anchor).map((item) =>
			visit(item, () => anchorBox(anchor, sheet), [1, 0, 0, 1, 0, 0])
		).join('')
	).join('');
	if (!shapeCount && !imageCount) {
		return {
			svg: '',
			width: 0,
			height: 0,
			shapeCount,
			imageCount,
			skippedImageCount,
			warnings: [...warnings]
		};
	}
	const width = Math.max(1, (bounds[2] - bounds[0]) / EMU_PER_PIXEL);
	const height = Math.max(1, (bounds[3] - bounds[1]) / EMU_PER_PIXEL);
	return {
		svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${
			bounds[0]
		} ${bounds[1]} ${width * EMU_PER_PIXEL} ${height * EMU_PER_PIXEL}">${content}</svg>`,
		width,
		height,
		shapeCount,
		imageCount,
		skippedImageCount,
		warnings: [...warnings]
	};
};
