import { XMLSerializer } from '@xmldom/xmldom';

import {
	type DrawingResources,
	drawingXmlToAppearance,
	type XlsxDrawingAppearance
} from '../xlsx/drawing-appearance';
import {
	child,
	children,
	drawingXmlToGeojson,
	parseXml,
	type XlsxDrawing
} from '../xlsx/drawing-geometry';

export type OfficeDrawing = XlsxDrawingAppearance & { geometry: XlsxDrawing; };

export interface OfficeDrawingDocument {
	items: { id: string; name: string; }[];
	readDrawing: (id: string) => Promise<OfficeDrawing>;
}

/** Select one compatibility branch, avoiding duplicate DrawingML/VML representations. */
export const drawingChildren = (node: Element): Element[] =>
	children(node).flatMap((item) => {
		if (item.localName !== 'AlternateContent') return [item];
		const choice = children(item, 'Choice').find((candidate) =>
			Array.from(candidate.getElementsByTagName('*')).some((element) =>
				['drawing', 'sp', 'pic', 'grpSp', 'wsp', 'wgp'].includes(element.localName)
			)
		);
		const branch = choice ?? children(item, 'Fallback')[0];
		return branch ? drawingChildren(branch) : [];
	});

export const drawingDescendants = (node: Element, name: string): Element[] =>
	drawingChildren(node).flatMap((item) =>
		item.localName === name ? [item] : drawingDescendants(item, name)
	);

export const renderOfficeDrawing = async (
	elements: Element[],
	resources: DrawingResources,
	warnings: string[] = []
): Promise<OfficeDrawing> => {
	// Normalize part containers only. The shared renderer generates allowlisted SVG.
	const root = parseXml('<drawing><absoluteAnchor/></drawing>');
	const anchor = children(root)[0];
	const notices = new Set(warnings);
	const append = (parent: Element, element: Element) => {
		const group = element.localName === 'grpSp';
		if (['sp', 'cxnSp', 'pic', 'grpSp'].includes(element.localName)) {
			const transform = child(child(element, group ? 'grpSpPr' : 'spPr'), 'xfrm');
			if (!child(transform, 'off') || !child(transform, 'ext')) {
				notices.add('位置・サイズを直接指定していない図形は省略しています。');
				return;
			}
		}
		const copy = element.cloneNode(!group) as Element;
		if (group) { for (const item of drawingChildren(element)) append(copy, item); }
		parent.appendChild(copy);
	};
	for (const element of elements) append(anchor, element);
	const xml = new XMLSerializer().serializeToString(root);
	const appearance = drawingXmlToAppearance(
		xml,
		undefined,
		resources
	);
	appearance.warnings = [...new Set([...notices, ...appearance.warnings])];
	return { ...appearance, geometry: await drawingXmlToGeojson(xml) };
};
