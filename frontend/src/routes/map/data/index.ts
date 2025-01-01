import { geoJsonPolygonEntry } from '$map/data/vector/geojson/polygon';
import { geoJsonLineStringEntry } from '$map/data/vector/geojson/lineString';
import { pmtilesPolygonEntry } from '$map/data/vector/pmtiles/polygon';
import type { VectorEntry } from '$routes/map/data/vector';

export type GeoDataType = 'raster' | 'vector' | '3d';

export type GeoDataEntry = VectorEntry;

// 共通の初期化処理
// visible を true にする
const initData = (data: GeoDataEntry) => {
	try {
		Object.values(data).forEach((value) => {
			value.style.visible = true;
		});
	} catch (e) {
		alert('visible を true にする処理でエラーが発生しました。');
	}

	return data;
};

export const geoDataEntry = (() => {
	const entries = [geoJsonPolygonEntry, geoJsonLineStringEntry, pmtilesPolygonEntry];

	// 全てのキーを取得
	const allKeys = entries.flatMap((entry) => Object.keys(entry));

	// 重複するキーを検出
	const duplicateKeys = allKeys.filter((key, index, self) => self.indexOf(key) !== index);

	// 警告を出力
	if (duplicateKeys.length > 0) {
		console.warn('Duplicate keys found while merging geoJsonEntry:', duplicateKeys);
	}

	// オブジェクトを結合
	return initData(Object.assign({}, ...entries));
})();

// Map に変換

// export const GeoDataIndex = new Map<string, GeoJsonEntry[keyof GeoJsonEntry]>(
// 	Object.entries(GeoDataEntry) as [string, GeoJsonEntry[keyof GeoJsonEntry]][]
// );
