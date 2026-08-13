import readExcelFile, { readSheet } from 'read-excel-file/browser';

import type { FeatureCollection } from '$routes/map/types/geojson';
import {
	type TabularCellValue,
	type TabularPreview,
	type TabularRow,
	tabularRowsToGeojson
} from '$routes/map/utils/formats/tabular';

type XlsxSheetRows = (TabularCellValue | null)[][];

export interface XlsxPreview extends TabularPreview {
	sheetNames: string[];
	activeSheet: string;
}

const stringifyHeaderCell = (value: TabularCellValue): string => {
	if (value instanceof Date) return value.toISOString();
	if (value === Date) return 'Date';
	if (value == null) return '';
	return String(value).trim();
};

const dedupeHeaders = (headers: string[]): string[] => {
	const seen = new Map<string, number>();

	return headers.map((header, index) => {
		const baseHeader = header || `column_${index + 1}`;
		const count = seen.get(baseHeader) ?? 0;
		seen.set(baseHeader, count + 1);
		return count === 0 ? baseHeader : `${baseHeader}_${count + 1}`;
	});
};

export const xlsxRowsToPreview = (rows: XlsxSheetRows, previewRowCount = 5): TabularPreview => {
	if (rows.length === 0) {
		return {
			headers: [],
			rows: []
		};
	}

	const headers = dedupeHeaders((rows[0] ?? []).map((value) => stringifyHeaderCell(value)));
	const previewRows = rows.slice(1, previewRowCount + 1).map((row) => {
		const record: TabularRow = {};

		headers.forEach((header, index) => {
			record[header] = row[index];
		});

		return record;
	});

	return {
		headers,
		rows: previewRows
	};
};

export const xlsxRowsToGeojson = (
	rows: XlsxSheetRows,
	latColumn: string,
	lonColumn: string
): FeatureCollection => {
	const preview = xlsxRowsToPreview(rows, Math.max(rows.length - 1, 0));
	return tabularRowsToGeojson(preview.headers, preview.rows, latColumn, lonColumn, 'Excel');
};

export const getXlsxPreview = async (
	file: File,
	sheet?: string
): Promise<XlsxPreview> => {
	const sheets = await readExcelFile(file);
	const selectedSheet = sheet
		? sheets.find((item) => item.sheet === sheet)
		: sheets[0];

	if (!selectedSheet) {
		throw new Error(`Sheet '${sheet}' not found`);
	}

	const preview = xlsxRowsToPreview(selectedSheet.data);

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
	sheet?: string
): Promise<FeatureCollection> => {
	const rows = sheet ? await readSheet(file, sheet) : await readSheet(file);
	return xlsxRowsToGeojson(rows, latColumn, lonColumn);
};
