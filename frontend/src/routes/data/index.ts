import { fgbPolygonEntry } from '$routes/data/vector/fgb/polygon';
import { fgbLineStringEntry } from '$routes/data/vector/fgb/lineString';
import { fgbPointEntry } from '$routes/data/vector/fgb/point';
import { fgbLabelEntry } from '$routes/data/vector/fgb/label';
import { pmtilesPolygonEntry } from '$routes/data/vector/pmtiles/polygon';
import { pmtilesPointEntry } from '$routes/data/vector/pmtiles/point';
import { mvtPolygonEntry } from '$routes/data/vector/mvt/polygon';

import type { GeoDataEntry } from '$routes/data/types';

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

const entryModules: Record<string, { default: GeoDataEntry }> = import.meta.glob(
	'$routes/data/entrys/**/*.ts',
	{
		eager: true
	}
);

export const rasterEntry: GeoDataEntry[] = Object.values(entryModules)
	.map((mod) => mod.default)
	.sort((a, b) => a.metaData.name.localeCompare(b.metaData.name, 'ja'));

const entries: GeoDataEntry[] = [
	...fgbPolygonEntry,
	...fgbLineStringEntry,
	...fgbPointEntry,
	...fgbLabelEntry,
	...pmtilesPointEntry,
	...pmtilesPolygonEntry,
	...mvtPolygonEntry,
	...rasterEntry
	// ...cogEntry
];

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
