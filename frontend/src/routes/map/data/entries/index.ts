import type { GeoDataEntry } from '$routes/map/data/types';

import type { LayerType } from '$routes/map/utils/entries';
import { getLayerType } from '$routes/map/utils/entries';
import Fuse from 'fuse.js';
import { encode } from '$routes/map/utils/normalized';

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
	['$routes/map/data/entries/**/[!_]*.ts', '!**/index.ts'],
	{ eager: true }
);

export const entries: GeoDataEntry[] = Object.values(entryModules)
	.map((mod) => mod.default)
	.sort((a, b) => a.metaData.name.localeCompare(b.metaData.name, 'ja'));

export const geoDataEntries = (() => {
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

export const layerDataFuse = new Fuse(geoDataEntries, {
	keys: ['metaData.name', 'metaData.tags', 'metaData.location', 'metaData.attribution'],
	threshold: 0.3,
	getFn: (obj: GeoDataEntry, path: string | string[]) => {
		const values = [];
		if (obj.metaData.name) values.push(encode(obj.metaData.name));
		if (obj.metaData.location) values.push(encode(obj.metaData.location));
		if (obj.metaData.attribution) values.push(encode(obj.metaData.attribution));
		if (obj.metaData.tags && Array.isArray(obj.metaData.tags)) {
			obj.metaData.tags.forEach((tag) => {
				values.push(encode(tag));
			});
		}
		return values;
	}
});

// TODO カスタムデータの削除処理
export class EntryIdToTypeMap {
	private static map: Map<string, LayerType> = new Map(
		entries.map((geoDataEntries) => [geoDataEntries.id, getLayerType(geoDataEntries) ?? 'raster'])
	);

	static get(id: string): LayerType | undefined {
		return this.map.get(id);
	}

	static has(id: string): boolean {
		return this.map.has(id);
	}

	static add(id: string, type: LayerType): void {
		if (!this.map.has(id)) {
			this.map.set(id, type);
		}
	}

	static keys(): string[] {
		return Array.from(this.map.keys());
	}
}
