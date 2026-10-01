import JSZip from 'jszip';

import {
	drawingChildren,
	drawingDescendants,
	type OfficeDrawingDocument,
	renderOfficeDrawing
} from '../office-drawing';
import { readEmbeddedImages, readPart, relationships } from '../office-drawing/package';
import { child, children, number, parseXml } from '../xlsx/drawing-geometry';

const attr = (element: Element | undefined, name: string): string =>
	Array.from(element?.attributes ?? []).find((item) => item.localName === name)?.value ?? '';

const make = (
	owner: Element,
	name: string,
	attributes: Record<string, string | number> = {}
): Element => {
	const element = owner.ownerDocument!.createElement(name);
	for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
	return element;
};

/** Word uses half-points and w:val attributes; convert text boxes to DrawingML runs. */
const wordText = (shape: Element): Element | undefined => {
	const content = child(child(shape, 'txbx'), 'txbxContent');
	if (!content) return undefined;
	const body = make(shape, 'txBody');
	body.appendChild(child(shape, 'bodyPr')?.cloneNode(true) ?? make(shape, 'bodyPr'));
	const convertProps = (props: Element | undefined, name: string) => {
		const result = make(shape, name);
		const size = Number(attr(child(props, 'sz'), 'val'));
		if (size > 0) result.setAttribute('sz', String(size * 50));
		for (const flag of ['b', 'i']) {
			const value = child(props, flag);
			if (value) {
				result.setAttribute(
					flag,
					['0', 'false', 'off'].includes(attr(value, 'val')) ? '0' : '1'
				);
			}
		}
		const underline = child(props, 'u');
		if (underline) result.setAttribute('u', attr(underline, 'val') === 'none' ? 'none' : 'sng');
		const color = attr(child(props, 'color'), 'val');
		if (/^[0-9a-f]{6}$/i.test(color)) {
			const fill = make(shape, 'solidFill');
			fill.appendChild(make(shape, 'srgbClr', { val: color }));
			result.appendChild(fill);
		}
		const fonts = child(props, 'rFonts');
		for (const [source, target] of [['ascii', 'latin'], ['eastAsia', 'ea']]) {
			const font = attr(fonts, source);
			if (font) result.appendChild(make(shape, target, { typeface: font }));
		}
		return result;
	};
	for (const paragraph of drawingDescendants(content, 'p')) {
		const p = make(shape, 'p');
		const props = child(paragraph, 'pPr');
		const align = attr(child(props, 'jc'), 'val');
		const pPr = make(shape, 'pPr', {
			algn: align === 'center' ? 'ctr' : align === 'right' ? 'r' : 'l'
		});
		pPr.appendChild(convertProps(child(props, 'rPr'), 'defRPr'));
		p.appendChild(pPr);
		for (const run of drawingDescendants(paragraph, 'r')) {
			for (const item of drawingChildren(run)) {
				if (['br', 'cr'].includes(item.localName)) {
					p.appendChild(make(shape, 'br'));
					continue;
				}
				if (!['t', 'tab'].includes(item.localName)) continue;
				const r = make(shape, 'r');
				r.appendChild(convertProps(child(run, 'rPr'), 'rPr'));
				const t = make(shape, 't');
				t.textContent = item.localName === 'tab' ? '    ' : item.textContent;
				r.appendChild(t);
				p.appendChild(r);
			}
		}
		body.appendChild(p);
	}
	return body;
};

const normalizeShape = (source: Element): Element => {
	const names: Record<string, string> = { wsp: 'sp', wgp: 'grpSp', wpc: 'grpSp' };
	const shape = make(source, names[source.localName] ?? source.localName);
	for (const item of drawingChildren(source)) {
		// Text is normalized below; keep one copy for both rendering and feature attributes.
		if (source.localName === 'wsp' && ['txbx', 'bodyPr'].includes(item.localName)) continue;
		if (['wsp', 'wgp', 'wpc', 'pic', 'sp', 'grpSp'].includes(item.localName)) {
			shape.appendChild(normalizeShape(item));
		} else shape.appendChild(item.cloneNode(true));
	}
	if (source.localName === 'wsp') {
		const text = wordText(source);
		if (text) shape.appendChild(text);
		const nv = make(source, 'nvSpPr');
		const props = child(source, 'cNvSpPr');
		if (props) nv.appendChild(props.cloneNode(true));
		shape.appendChild(nv);
	}
	return shape;
};

const positionDrawing = (anchor: Element, warnings: Set<string>): Element | undefined => {
	const data = child(child(anchor, 'graphic'), 'graphicData');
	const source = data
		&& drawingChildren(data).find((item) =>
			['wsp', 'wgp', 'wpc', 'pic'].includes(item.localName)
		);
	if (!source) {
		warnings.add('未対応の図形・グラフを省略しています。');
		return;
	}
	const shape = normalizeShape(source);
	if (shape.localName === 'sp') {
		const metadata = child(anchor, 'docPr');
		const nonVisual = child(shape, 'nvSpPr');
		if (metadata && nonVisual) {
			nonVisual.appendChild(make(shape, 'cNvPr', {
				id: metadata.getAttribute('id') ?? '',
				name: metadata.getAttribute('name') ?? ''
			}));
		}
	}
	const props = child(shape, shape.localName === 'grpSp' ? 'grpSpPr' : 'spPr');
	if (!props) {
		warnings.add('配置を解釈できない図形を省略しています。');
		return;
	}
	const xfrm = child(props, 'xfrm') ?? make(shape, 'xfrm');
	if (!xfrm.parentNode) props.appendChild(xfrm);
	const simple = ['1', 'true'].includes(anchor.getAttribute('simplePos') ?? '');
	const position = (axis: 'H' | 'V'): number => {
		if (anchor.localName === 'inline') return 0;
		if (simple) return number(child(anchor, 'simplePos'), axis === 'H' ? 'x' : 'y');
		const offset = child(child(anchor, `position${axis}`), 'posOffset');
		if (!offset) throw new Error('alignment');
		const value = Number(offset.textContent);
		if (!Number.isFinite(value)) throw new Error('position');
		return value;
	};
	try {
		const offset = child(xfrm, 'off') ?? make(shape, 'off');
		offset.setAttribute('x', String(position('H')));
		offset.setAttribute('y', String(position('V')));
		if (!offset.parentNode) xfrm.appendChild(offset);
		const extent = child(anchor, 'extent');
		if (extent) {
			const size = child(xfrm, 'ext') ?? make(shape, 'ext');
			size.setAttribute('cx', String(number(extent, 'cx')));
			size.setAttribute('cy', String(number(extent, 'cy')));
			if (!size.parentNode) xfrm.appendChild(size);
		}
		return shape;
	} catch {
		warnings.add('中央揃えなど、位置を確定できない図形を省略しています。');
		return undefined;
	}
};

export const readDocxDrawings = async (data: ArrayBuffer): Promise<OfficeDrawingDocument> => {
	const zip = await JSZip.loadAsync(data);
	const source = 'word/document.xml';
	const root = parseXml(await readPart(zip, source));
	const groups: Element[][] = [];
	// Paragraph-relative positions cannot be combined across paragraphs without Word's layout engine.
	for (const paragraph of drawingDescendants(root, 'p')) {
		const anchors = drawingDescendants(paragraph, 'drawing').flatMap((drawing) =>
			children(drawing).filter((item) => ['anchor', 'inline'].includes(item.localName))
		);
		const positioned = anchors.filter((item) => item.localName === 'anchor');
		// Different reference frames do not share a reliable origin.
		const frames = new Map<string, Element[]>();
		for (const anchor of positioned) {
			const frame = ['positionH', 'positionV'].map((axis) =>
				child(anchor, axis)?.getAttribute('relativeFrom') ?? ''
			).join('/');
			const group = frames.get(frame) ?? [];
			group.push(anchor);
			frames.set(frame, group);
		}
		groups.push(
			...frames.values(),
			...anchors.filter((item) => item.localName === 'inline').map((item) => [item])
		);
	}
	const items = groups.map((_, index) => ({ id: String(index), name: `図面 ${index + 1}` }));
	const [images, themeRels] = await Promise.all([
		readEmbeddedImages(zip, source),
		relationships(zip, source, '/theme')
	]);
	const themePath = [...themeRels.values()][0];
	const themeXml = themePath ? await readPart(zip, themePath) : undefined;
	return {
		items,
		readDrawing: async (id) => {
			if (!items.some((item) => item.id === id)) {
				throw new Error('Wordの図面が見つかりません');
			}
			const warnings = new Set([
				'同じ段落・配置基準の図形をまとめて読み込みます。本文・表・ページ全体のレイアウトは含みません。'
			]);
			const anchors = [...groups[Number(id)]].sort((a, b) =>
				Number(['1', 'true'].includes(b.getAttribute('behindDoc') ?? ''))
					- Number(['1', 'true'].includes(a.getAttribute('behindDoc') ?? ''))
				|| number(a, 'relativeHeight') - number(b, 'relativeHeight')
			);
			const shapes = anchors.map((anchor) => positionDrawing(anchor, warnings)).filter((
				item
			): item is Element => !!item);
			return renderOfficeDrawing(shapes, { images, themeXml }, [...warnings]);
		}
	};
};
