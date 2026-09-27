import JSZip from 'jszip';

import {
	child,
	children,
	drawingXmlToGeojson,
	parseXml,
	type XlsxDrawing
} from './drawing-geometry';

export type { XlsxDrawing } from './drawing-geometry';

const resolvePart = (source: string, target: string): string => {
	const parts = target.startsWith('/') ? [] : source.split('/').slice(0, -1);
	for (const part of target.split('/')) {
		if (part === '..') parts.pop();
		else if (part && part !== '.') parts.push(part);
	}
	return parts.join('/');
};

const relationships = async (zip: JSZip, source: string): Promise<Map<string, string>> => {
	const parts = source.split('/');
	const name = parts.pop();
	const file = zip.file([...parts, '_rels', `${name}.rels`].join('/'));
	if (!file) return new Map();
	const root = parseXml(await file.async('string'));
	return new Map(
		children(root, 'Relationship')
			.filter((item) => item.getAttribute('TargetMode') !== 'External')
			.map((
				item
			) => [
				item.getAttribute('Id') ?? '',
				resolvePart(source, item.getAttribute('Target') ?? '')
			])
	);
};

const relationshipId = (element: Element): string =>
	Array.from(element.attributes).find((attr) => attr.localName === 'id')?.value ?? '';

export interface XlsxDrawingWorkbook {
	sheetNames: string[];
	readSheet: (sheetName: string) => Promise<XlsxDrawing>;
}

/** Keep the ZIP in the upload form, never in a layer entry or global cache. */
export const readXlsxDrawingWorkbook = async (data: ArrayBuffer): Promise<XlsxDrawingWorkbook> => {
	const zip = await JSZip.loadAsync(data);
	const readPart = async (path: string) => {
		const file = zip.file(path);
		if (!file) throw new Error('Excelの図面参照先が見つかりません');
		return file.async('string');
	};
	const workbookPath = 'xl/workbook.xml';
	const [workbookXml, workbookRels] = await Promise.all([
		readPart(workbookPath),
		relationships(zip, workbookPath)
	]);
	const sheets = children(child(parseXml(workbookXml), 'sheets'), 'sheet');
	return {
		sheetNames: sheets.map((sheet) => sheet.getAttribute('name') ?? ''),
		readSheet: async (sheetName) => {
			const sheet = sheets.find((item) => item.getAttribute('name') === sheetName);
			const path = sheet && workbookRels.get(relationshipId(sheet));
			if (!path) throw new Error('Excelのシートが見つかりません');
			const sheetXml = await readPart(path);
			const drawing = child(parseXml(sheetXml), 'drawing');
			if (!drawing) {
				return {
					featureCollection: { type: 'FeatureCollection', features: [] },
					shapeCount: 0,
					skippedShapeCount: 0,
					imageCount: 0
				};
			}
			const sheetRels = await relationships(zip, path);
			const drawingPath = sheetRels.get(relationshipId(drawing));
			if (!drawingPath) throw new Error('Excelの図面参照先が見つかりません');
			return drawingXmlToGeojson(await readPart(drawingPath), sheetXml);
		}
	};
};
