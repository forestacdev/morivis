import { GEOJSON_BASE_PATH, GIFU_DATA_BASE_PATH } from '$routes/map/constants';
import type { Region } from '$routes/map/data/location';
import type { VectorFormat, VectorProperties, VectorInteraction } from '$routes/map/data/vector';
import type { GeoDataType } from '$map/data';
import { fgbPolygonEntry } from '$map/data/vector/fgb/polygon';

import type { VectorStyle } from '$map/data/vector/style';

interface FgbMetaData {
	name: string;
	description: string;
	attribution: string;
	location: Region;
	minZoom: number;
	maxZoom: number;
	bounds: [number, number, number, number] | null;
}

export interface FgbEntry {
	[id: string]: {
		type: GeoDataType;
		format: VectorFormat;
		metaData: FgbMetaData;
		properties: VectorProperties;
		interaction: VectorInteraction;
		style: VectorStyle;
	};
}

export const fgbEntry = (() => {
	const entries = [fgbPolygonEntry];

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
