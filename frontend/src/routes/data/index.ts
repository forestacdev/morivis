import { fgbPolygonEntry } from '$routes/data/vector/fgb/polygon';
import { fgbLineStringEntry } from '$routes/data/vector/fgb/lineString';
import { fgbPointEntry } from '$routes/data/vector/fgb/point';
import { fgbLabelEntry } from '$routes/data/vector/fgb/label';
import { pmtilesPolygonEntry } from '$routes/data/vector/pmtiles/polygon';
import { pmtilesPointEntry } from '$routes/data/vector/pmtiles/point';
import { imageTileCategoricalEntry } from '$routes/data/raster/imageTile/categorical';
import { imageTileBaseMapEntry } from '$routes/data/raster/imageTile/basemap';
import { pmTilesRasterCategoricalEntry } from '$routes/data/raster/pmtiles/categorical';
import { mvtPolygonEntry } from '$routes/data/vector/mvt/polygon';
import { imageTileDemEntry } from '$routes/data/raster/imageTile/dem';

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

const entries: GeoDataEntry[] = [
	...fgbPolygonEntry,
	...fgbLineStringEntry,
	...fgbPointEntry,
	...fgbLabelEntry,
	...pmtilesPointEntry,
	...pmtilesPolygonEntry,
	...mvtPolygonEntry,
	...imageTileCategoricalEntry,
	...imageTileBaseMapEntry,
	...pmTilesRasterCategoricalEntry,
	...imageTileDemEntry
	// ...cogEntry
];

const modules: Record<string, { default: GeoDataEntry }> = import.meta.glob(
	'$routes/data/vector/fgb/*.ts',
	{
		eager: true
	}
);

export const test = Object.values(modules).map((mod) => mod);

console.log(test);

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
