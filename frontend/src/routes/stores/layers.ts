import type { GeoDataEntry } from '$routes/map/data/types';
import { EntryIdToTypeMap } from '$routes/map/data/entries';
import { writable, derived, get } from 'svelte/store';
import { GeojsonCache } from '$routes/map/utils/file/geojson';
import { INT_ADD_LAYER_IDS } from '$routes/constants';
import { layerAttributions } from './attributions';
import { getLayerType, type LayerType } from '$routes/map/utils/entries';
import { JoinDataCache } from '$routes/map/utils/join_data';

export type ReorderStatus = 'idle' | 'success' | 'invalid';

export const reorderStatus = writable<ReorderStatus>('idle');

const TYPE_ORDER: LayerType[] = ['point', 'line', 'polygon', 'raster'];

const sortLayerIds = (ids: string[]): string[] => {
	return ids.sort((a, b) => {
		if (!EntryIdToTypeMap.has(a) || !EntryIdToTypeMap.has(b)) {
			console.warn(`EntryIdToTypeMap does not have entry for ${a} or ${b}`);
		}
		const typeA = EntryIdToTypeMap.get(a) || 'raster';
		const typeB = EntryIdToTypeMap.get(b) || 'raster';

		const indexA = TYPE_ORDER.indexOf(typeA);
		const indexB = TYPE_ORDER.indexOf(typeB);

		return indexA - indexB;
	});
};

const createLayerStore = () => {
	const store = writable<string[]>([...INT_ADD_LAYER_IDS]);
	const { subscribe, update, set } = store;

	return {
		subscribe,

		setLayers: (layers: string[]) => {
			// GeojsonCacheの初期化
			GeojsonCache.clear();
			// ストアの値を更新
			set(sortLayerIds(layers)); // または set((state) => ({ ...state, layers }))
		},

		// 追加
		add: (id: string) =>
			update((layers) => {
				if (!layers.includes(id)) {
					layers = [id, ...layers];
				}
				return sortLayerIds(layers);
			}),
		has: (id: string) => {
			// IDがストアに存在するかチェック
			return get(store).includes(id);
		},

		addType: (id: string, type: LayerType) => {
			EntryIdToTypeMap.add(id, type);
		},

		// 削除
		remove: (id: string) =>
			update((layers) => {
				const newLayers = layers.filter((layerId) => layerId !== id);
				// GeojsonCacheからも削除
				if (GeojsonCache.has(id)) GeojsonCache.remove(id);

				// JoinDataCacheからも削除
				if (JoinDataCache.has(id)) JoinDataCache.remove(id);
				layerAttributions.remove(id);
				return newLayers;
			}),

		// 並び替え（タイプ内）
		reorder: (fromId: string, toId: string) =>
			update((layers) => {
				const fromIndex = layers.indexOf(fromId);
				const toIndex = layers.indexOf(toId);

				// 両方存在し、かつ違う位置でなければ無視
				if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
					reorderStatus.set('invalid');
					return layers;
				}

				const newLayers = [...layers];
				const item = newLayers.splice(fromIndex, 1)[0];
				newLayers.splice(toIndex, 0, item);

				reorderStatus.set('success');
				return sortLayerIds(newLayers);
			}),

		// 完全リセット
		reset: () => {
			for (const id of GeojsonCache.keys()) {
				GeojsonCache.remove(id);
			}

			set([...INT_ADD_LAYER_IDS]);
		}
	};
};

/** 表示中レイヤーのIDを管理するストア */
export const activeLayerIdsStore = createLayerStore();

export const getEntryIds = (layerEntries: GeoDataEntry[]): string[] => {
	return layerEntries.map((entry) => entry.id);
};

/** ベースマップ */
export type BaseMapType = 'satellite' | 'hillshade' | 'osm';
export const selectedBaseMap = writable<BaseMapType>('satellite');

/** アカデミーPOI */
export const showPoiLayer = writable<boolean>(true);

/** ラベルレイヤー */
export const showLabelLayer = writable<boolean>(true);

/** 境界 */
export const showBoundaryLayer = writable<boolean>(true);

/** 道路レイヤー */
export const showRoadLayer = writable<boolean>(true);

/** タイル座標レイヤー */
export const showXYZTileLayer = writable<boolean>(false);

/** ストリートビューレイヤー */
export const showStreetViewLayer = writable<boolean>(false);
