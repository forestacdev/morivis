import type { MorivisLayerEntry } from '$routes/map/data/types';

const LAYER_ENTRIES_KEY = 'layerEntries';

/** レイヤーエントリをsessionStorageに保存する関数 */
export const saveToLayerEntries = (entries: MorivisLayerEntry[]) => {
	sessionStorage.setItem(LAYER_ENTRIES_KEY, JSON.stringify(entries));
};

/** sessionStorageからレイヤーエントリを取得する関数 */
export const loadLayerEntries = (): MorivisLayerEntry[] | null => {
	const entries = sessionStorage.getItem(LAYER_ENTRIES_KEY);
	if (entries && entries !== 'undefined' && entries !== 'null' && entries !== '[]') {
		return JSON.parse(entries);
	}
	return null;
};
