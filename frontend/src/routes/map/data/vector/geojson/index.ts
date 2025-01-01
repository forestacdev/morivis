import { GEOJSON_BASE_PATH, GIFU_DATA_BASE_PATH } from '$routes/map/constants';
import type { Region } from '$routes/map/data/location';
import type { VectorFormat, VectorProperties, VectorInteraction } from '$routes/map/data/vector';
import type { GeoDataType } from '$map/data';
import { geoJsonPolygonEntry } from '$map/data/vector/geojson/polygon';
import { geoJsonLineStringEntry } from '$map/data/vector/geojson/lineString';

import type { VectorStyle } from '$map/data/vector/style';

interface GeoJsonMetaData {
	name: string;
	description: string;
	attribution: string;
	location: Region;
	minZoom: number;
	maxZoom: number;
	bounds: [number, number, number, number] | null;
}

export interface GeoJsonEntry {
	[id: string]: {
		type: GeoDataType;
		format: VectorFormat;
		metaData: GeoJsonMetaData;
		properties: VectorProperties;
		interaction: VectorInteraction;
		style: VectorStyle;
	};
}

// 共通の初期化処理
const initPolygonData = (data: GeoJsonEntry) => {
	Object.values(data).forEach((value) => {
		console.log(value);
		value.format.geometryType = 'Polygon';
	});

	return data;
};

const initLineStringData = (data: GeoJsonEntry) => {
	Object.values(data).forEach((value) => {
		value.format.geometryType = 'LineString';
	});

	return data;
};

const initPointData = (data: GeoJsonEntry) => {
	Object.values(data).forEach((value) => {
		value.format.geometryType = 'Point';
	});

	return data;
};

const initLabelData = (data: GeoJsonEntry) => {
	Object.values(data).forEach((value) => {
		value.format.geometryType = 'Label';
	});

	return data;
};

export const geoJsonEntry = (() => {
	const entries = [geoJsonPolygonEntry, geoJsonLineStringEntry];

	// 全てのキーを取得
	const allKeys = entries.flatMap((entry) => Object.keys(entry));

	// 重複するキーを検出
	const duplicateKeys = allKeys.filter((key, index, self) => self.indexOf(key) !== index);

	// 警告を出力
	if (duplicateKeys.length > 0) {
		console.warn('Duplicate keys found while merging geoJsonEntry:', duplicateKeys);
	}

	// オブジェクトを結合
	return Object.assign({}, ...entries);
})();
