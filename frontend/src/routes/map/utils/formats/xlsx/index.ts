import readExcelFile, { readSheet } from 'read-excel-file/browser';

import type { FeatureCollection } from '$routes/map/types/geojson';
import {
	type TabularCellValue,
	tabularMatrixToGeojson,
	tabularMatrixToPreview,
	type TabularPreview,
	type TabularPreviewOptions
} from '$routes/map/utils/formats/tabular';

type XlsxSheetRows = (TabularCellValue | null)[][];

export interface XlsxPreview extends TabularPreview {
	sheetNames: string[];
	activeSheet: string;
}
export const xlsxRowsToPreview = (
	rows: XlsxSheetRows,
	options: TabularPreviewOptions = {}
): TabularPreview => tabularMatrixToPreview(rows, options);

export const xlsxRowsToGeojson = (
	rows: XlsxSheetRows,
	latColumn: string,
	lonColumn: string,
	headerRowNumber = 1
): FeatureCollection =>
	tabularMatrixToGeojson(rows, latColumn, lonColumn, 'Excel', headerRowNumber);

export const getXlsxPreview = async (
	file: File,
	sheet?: string,
	options: TabularPreviewOptions = {}
): Promise<XlsxPreview> => {
	const sheets = await readExcelFile(file);
	const selectedSheet = sheet ? sheets.find((item) => item.sheet === sheet) : sheets[0];

	if (!selectedSheet) {
		throw new Error(`Sheet '${sheet}' not found`);
	}

	const preview = xlsxRowsToPreview(selectedSheet.data, options);

	return {
		...preview,
		sheetNames: sheets.map((item) => item.sheet),
		activeSheet: selectedSheet.sheet
	};
};

export const xlsxFileToGeojson = async (
	file: File,
	latColumn: string,
	lonColumn: string,
	sheet?: string,
	headerRowNumber = 1
): Promise<FeatureCollection> => {
	const rows = sheet ? await readSheet(file, sheet) : await readSheet(file);
	return xlsxRowsToGeojson(rows, latColumn, lonColumn, headerRowNumber);
};
