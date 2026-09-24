import type { PmxMorphCatalog } from '$routes/map/utils/three/pmx-morphs';
import { writable } from 'svelte/store';

/** ロード中のモデルから取得した一覧。描画オブジェクトは格納しない。 */
const catalogStore = writable<Record<string, PmxMorphCatalog>>({});
export const pmxMorphCatalogs = { subscribe: catalogStore.subscribe };
export const setPmxMorphCatalog = (id: string, catalog: PmxMorphCatalog) => {
	catalogStore.update(current => ({ ...current, [id]: catalog }));
};
export const removePmxMorphCatalog = (id: string) => {
	catalogStore.update(current => {
		const next = { ...current };
		delete next[id];
		return next;
	});
};
