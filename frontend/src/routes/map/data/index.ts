import { fgbPolygonEntry } from '$map/data/vector/fgb/polygon';
import { fgbLineStringEntry } from '$map/data/vector/fgb/lineString';
import { pmtilesPolygonEntry } from '$map/data/vector/pmtiles/polygon';
import type { GeoDataEntry } from '$routes/map/data/types';

// 共通の初期化処理
// visible を true にする
const initData = (data: GeoDataEntry[]) => {
	try {
		data.forEach((value) => {
			value.style.visible = true;
		});
	} catch (e) {
		console.error(e);
		console.warn('初期化処理に失敗しました。');
	}

	return data;
};

const entries: GeoDataEntry[] = [...fgbPolygonEntry, ...fgbLineStringEntry, ...pmtilesPolygonEntry];

export const geoDataEntry = (() => {
	// 全てのIDを取得
	const allIds = entries.map((entry) => entry.id);

	// 重複するIDを検出
	const duplicateKeys = allIds.filter((id, index, self) => self.indexOf(id) !== index);

	// 警告を出力
	if (duplicateKeys.length > 0) {
		console.warn('idが重複してます。:', duplicateKeys);
	}

	// オブジェクトを結合
	return initData(entries);
})();
