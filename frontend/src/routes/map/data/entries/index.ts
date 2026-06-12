import type { MorivisLayerEntry, MorivisLayerEntryCatalogItem } from '$routes/map/data/types';
import { activeLayerIdsStore } from '$routes/stores/layers';

import { encode } from '$routes/map/utils/data/normalize';
import type { LayerType } from '$routes/map/utils/entries';
import { getLayerType } from '$routes/map/utils/entries';
import Fuse from 'fuse.js';

// 共通の初期化処理
// visible を true にする
const initData = (data: MorivisLayerEntry[]) => {
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

const isDev = !import.meta.env.PROD;

type EntryModule = { default: MorivisLayerEntry; };
type CatalogModule = { default: MorivisLayerEntryCatalogItem; };

const allModules = import.meta.glob<EntryModule>(
	[
		'$routes/map/data/entries/**/[!_]*.ts',
		'!$routes/map/data/entries/lazy/**',
		'!**/index.ts',
		'!**/_*/**'
	],
	{ eager: true }
);

const lazyEntryModules = import.meta.glob<CatalogModule>(
	['$routes/map/data/entries/lazy/**/[!_]*.ts', '!**/index.ts', '!**/_*/**'],
	{ eager: true }
);

const markEntryNeedsLazyHydration = (entry: MorivisLayerEntry, value: boolean): MorivisLayerEntry => {
	entry.metaData.needsLazyHydration = value;
	return entry;
};

const staticEntries = Object.values(allModules).map((mod) => mod.default);
const lazyCatalogItems = Object.values(lazyEntryModules).map((mod) => ({
	...mod.default,
	entry: markEntryNeedsLazyHydration(mod.default.entry, true)
}));
const lazyEntries = lazyCatalogItems.map((item) => item.entry);
const allEntries = [...staticEntries, ...lazyEntries];
const debugEntries = isDev ? allEntries.filter((entry) => entry.id.startsWith('!')) : [];
const hasDebugEntries = debugEntries.length > 0;

const entryCatalogItems: MorivisLayerEntryCatalogItem[] = hasDebugEntries
	? [
		...Object.values(allModules)
			.filter((mod) => mod.default.id.startsWith('!'))
			.map((mod) => ({ entry: mod.default })),
		...lazyCatalogItems.filter((item) => item.entry.id.startsWith('!'))
	]
	: [...Object.values(allModules).map((mod) => ({ entry: mod.default })), ...lazyCatalogItems];

const entryCatalogMap = new Map(entryCatalogItems.map((item) => [item.entry.id, item]));
const lazyEntryIdSet = new Set(
	entryCatalogItems.filter((item) => item.loadEntry).map((item) => item.entry.id)
);

if (hasDebugEntries) {
	console.warn('デバッグ用データエントリが読み込まれました。');
	activeLayerIdsStore.setLayers(debugEntries.map((entry) => entry.id));
}
export const entries: MorivisLayerEntry[] = entryCatalogItems
	.map((item) => item.entry)
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

const cloneStyle = (style: MorivisLayerEntry['style']): MorivisLayerEntry['style'] =>
	JSON.parse(JSON.stringify(style)) as MorivisLayerEntry['style'];

const initialEntryStyleMap = new Map<string, MorivisLayerEntry['style']>(
	entries.map((entry) => [entry.id, cloneStyle(entry.style)])
);

const resolvedLazyEntryMap = new Map<string, MorivisLayerEntry>();
const inflightLazyEntryMap = new Map<string, Promise<MorivisLayerEntry>>();

export const registerInitialEntryStyle = (entry: MorivisLayerEntry) => {
	if (initialEntryStyleMap.has(entry.id)) return;
	initialEntryStyleMap.set(entry.id, cloneStyle(entry.style));
};

export const unregisterInitialEntryStyle = (entryId: string) => {
	initialEntryStyleMap.delete(entryId);
};

export const getInitialEntryStyle = (entryId: string): MorivisLayerEntry['style'] | undefined => {
	const style = initialEntryStyleMap.get(entryId);
	if (!style) return undefined;
	return cloneStyle(style);
};

export const findCatalogEntry = (entryId: string): MorivisLayerEntry | undefined => {
	return entryCatalogMap.get(entryId)?.entry;
};

export const isLazyCatalogEntry = (entryId: string): boolean => {
	return lazyEntryIdSet.has(entryId);
};

export const needsLazyHydration = (entry: MorivisLayerEntry): boolean => {
	return entry.metaData.needsLazyHydration === true;
};

export const resolveMorivisLayerEntry = async (entryId: string): Promise<MorivisLayerEntry | null> => {
	const catalogItem = entryCatalogMap.get(entryId);
	if (!catalogItem) return null;

	if (!catalogItem.loadEntry) {
		return catalogItem.entry;
	}

	const cachedEntry = resolvedLazyEntryMap.get(entryId);
	if (cachedEntry) return cachedEntry;

	const inflightEntry = inflightLazyEntryMap.get(entryId);
	if (inflightEntry) return inflightEntry;

	const loadPromise = catalogItem
		.loadEntry()
		.then((entry: MorivisLayerEntry) => {
			markEntryNeedsLazyHydration(entry, false);
			resolvedLazyEntryMap.set(entryId, entry);
			return entry;
		})
		.finally(() => {
			inflightLazyEntryMap.delete(entryId);
		});

	inflightLazyEntryMap.set(entryId, loadPromise);
	return loadPromise;
};

export const layerDataFuse = new Fuse(geoDataEntries, {
	keys: ['metaData.name', 'metaData.tags', 'metaData.location', 'metaData.attribution'],
	threshold: 0.3,
	getFn: (obj: MorivisLayerEntry, path: string | string[]) => {
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
		entries.map((
			geoDataEntries
		) => [geoDataEntries.id, getLayerType(geoDataEntries) ?? 'raster'])
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
