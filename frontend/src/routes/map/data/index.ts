import { vectorEntry } from '$routes/map/data/vector';
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

export const geoDataEntry: GeoDataEntry = {
	...initData(vectorEntry)
};

// Map に変換

// export const GeoDataIndex = new Map<string, GeoJsonEntry[keyof GeoJsonEntry]>(
// 	Object.entries(GeoDataEntry) as [string, GeoJsonEntry[keyof GeoJsonEntry]][]
// );
