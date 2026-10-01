import JSZip from 'jszip';
import { readEmbeddedImages, relationshipId, relationships } from '../office-drawing/package';

import { drawingXmlToAppearance, type XlsxDrawingAppearance } from './drawing-appearance';

import {
	child,
	children,
	drawingXmlToGeojson,
	parseXml,
	type XlsxDrawing as XlsxDrawingGeometry
} from './drawing-geometry';

export type XlsxDrawing = XlsxDrawingGeometry & { appearance: XlsxDrawingAppearance; };

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
	const themeRels = await relationships(zip, workbookPath, '/theme');
	const themePath = [...themeRels.values()][0];
	const themeXml = themePath ? await readPart(themePath) : undefined;
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
					imageCount: 0,
					appearance: {
						svg: '',
						width: 0,
						height: 0,
						shapeCount: 0,
						imageCount: 0,
						skippedImageCount: 0,
						warnings: []
					}
				};
			}
			const sheetRels = await relationships(zip, path);
			const drawingPath = sheetRels.get(relationshipId(drawing));
			if (!drawingPath) throw new Error('Excelの図面参照先が見つかりません');
			const drawingXml = await readPart(drawingPath);
			const images = await readEmbeddedImages(zip, drawingPath);
			return {
				...await drawingXmlToGeojson(drawingXml, sheetXml),
				appearance: drawingXmlToAppearance(drawingXml, sheetXml, { themeXml, images })
			};
		}
	};
};
