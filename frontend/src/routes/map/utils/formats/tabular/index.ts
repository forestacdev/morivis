import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { FeatureProp } from '$routes/map/types/properties';
import { parseDmsString } from '$routes/map/utils/proj/dms';
import { showNotification } from '$routes/stores/notification';

export type TabularCellValue =
	| string
	| number
	| boolean
	| Date
	| typeof Date
	| null
	| undefined;

export type TabularRow = Record<string, TabularCellValue>;

export interface TabularPreview {
	headers: string[];
	rows: TabularRow[];
}

const parseCoordinate = (value: TabularCellValue): number => {
	if (typeof value === 'number') return value;
	if (typeof value === 'string') {
		const trimmed = value.trim();
		const num = Number(trimmed);
		if (!isNaN(num)) return num;
		const dms = parseDmsString(trimmed);
		if (dms !== null) return dms;
	}
	return NaN;
};

const toFeaturePropValue = (
	value: TabularCellValue
): string | number | boolean | undefined => {
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (value === Date) {
		return 'Date';
	}

	return undefined;
};

const toFeatureProperties = (row: TabularRow): FeatureProp => {
	const properties: FeatureProp = {};

	Object.entries(row).forEach(([key, value]) => {
		const normalizedValue = toFeaturePropValue(value);
		if (normalizedValue !== undefined) {
			properties[key] = normalizedValue;
		}
	});

	return properties;
};

export const tabularRowsToGeojson = (
	headers: string[],
	rows: TabularRow[],
	latColumn: string,
	lonColumn: string,
	sourceName: string
): FeatureCollection => {
	if (!headers.includes(latColumn)) {
		const message = `指定された緯度カラム '${latColumn}' が見つかりません。`;
		showNotification(message, 'error');
		throw new Error(`Latitude column '${latColumn}' not found`);
	}

	if (!headers.includes(lonColumn)) {
		const message = `指定された経度カラム '${lonColumn}' が見つかりません。`;
		showNotification(message, 'error');
		throw new Error(`Longitude column '${lonColumn}' not found`);
	}

	const validRows = rows.filter(
		(row) =>
			row[latColumn] != null
			&& row[lonColumn] != null
			&& row[latColumn] !== ''
			&& row[lonColumn] !== ''
	);

	if (validRows.length === 0) {
		showNotification(`${sourceName}に有効な緯度経度のデータがありません。`, 'error');
		throw new Error('No valid latitude and longitude data found');
	}

	const features: Feature[] = [];
	const invalidRows: number[] = [];

	validRows.forEach((row, index) => {
		const lat = parseCoordinate(row[latColumn]);
		const lon = parseCoordinate(row[lonColumn]);

		if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
			invalidRows.push(index + 1);
			return;
		}

		features.push({
			type: 'Feature',
			properties: toFeatureProperties(row),
			geometry: {
				type: 'Point',
				coordinates: [lon, lat]
			}
		});
	});

	if (invalidRows.length > 0) {
		showNotification(
			`${invalidRows.length}行の無効な座標データをスキップしました。`,
			'warning'
		);
	}

	if (features.length === 0) {
		showNotification('有効な座標データがありません。', 'error');
		throw new Error('No valid coordinate data found');
	}

	return {
		type: 'FeatureCollection',
		features
	};
};
