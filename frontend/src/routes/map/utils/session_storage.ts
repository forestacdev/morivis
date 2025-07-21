import type { GeoDataEntry } from '$routes/map/data/types';

/** レイヤーエントリをsessionStorageに保存する関数 */
export const saveToLayerEntries = (entries: GeoDataEntry[]) => {
	sessionStorage.setItem('layerEntries', JSON.stringify(entries));
};

/** sessionStorageからレイヤーエントリを取得する関数 */
export const loadLayerEntries = (): GeoDataEntry[] | null => {
	const entries = sessionStorage.getItem('layerEntries');
	if (entries && entries !== 'undefined' && entries !== 'null' && entries !== '[]') {
		return JSON.parse(entries);
	}
	return null;
};
