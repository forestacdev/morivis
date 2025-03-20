import { writable } from 'svelte/store';
import { INT_ADD_LAYER_IDS } from '$routes/constants';

import { geoDataEntry } from '$routes/data';
import type { FeatureCollection, Feature } from 'geojson';
import type { GeoDataEntry } from '$routes/data/types';
import type { MapGeoJSONFeature } from 'maplibre-gl';

/* クリックイベントを除外するレイヤーID */
export const excludeIdsClickLayer = writable<string[]>(['HighlightFeatureId']);

/**  クリックイベントを発火するレイヤーID */
export const clickableVectorIds = writable<string[]>([]);

/* クリックイベントを発火するレイヤーID */
export const clickableRasterIds = writable<string[]>([]);

/**  レイヤーの出典表示 */
export const layerAttributions = writable<string[]>([]);

/**  デバッグモード */
export const DEBUG_MODE = writable<boolean>(false);

/**  地図のモード */
export const mapMode = writable<'view' | 'edit' | 'analysis' | 'small'>('view');

/**  3D地形 */
export const isTerrain3d = writable<boolean>(false);

/** サイドメニューの表示状態 */
export const showSideMenu = writable<boolean>(false);

/** TODO:編集モード */
export const isEdit = writable<boolean>(false);

// 配列を自動ソートする ラスターが下になるように
const sortedLayers = (layers: string[]) => {
	const raster: string[] = [];
	const vector: string[] = [];
	layers.forEach((layerId) => {
		// typeを調べる
		const data = geoDataEntry.find((entry) => entry.id === layerId);
		if (data?.type === 'raster') {
			raster.push(layerId);
		} else {
			vector.push(layerId);
		}
	});
	return [...vector, ...raster];
};

const createLayerStore = (initialLayers: string[] = []) => {
	const newLayers = sortedLayers(initialLayers);

	const { subscribe, set, update } = writable<string[]>(newLayers);

	return {
		subscribe,
		addLayer: (id: string) =>
			update((layers) => {
				if (!layers.includes(id)) {
					return sortedLayers([id, ...layers]);
				}
				return layers;
			}),
		hasLayer: (id: string) => {
			let layerExists = false;
			subscribe((layers) => {
				layerExists = layers.includes(id);
			})();
			return layerExists;
		},
		removeLayer: (id: string) => update((layers) => layers.filter((layerId) => layerId !== id)),
		reorderLayer: (id: string, direction: 'up' | 'down') =>
			update((layers) => {
				const index = layers.indexOf(id);
				if (index === -1) return layers; // IDが見つからない場合は何もしない

				const newLayers = [...layers];
				if (direction === 'up' && index > 0) {
					// 上に移動（配列の前方に移動）
					[newLayers[index - 1], newLayers[index]] = [newLayers[index], newLayers[index - 1]];
				} else if (direction === 'down' && index < layers.length - 1) {
					// 下に移動（配列の後方に移動）
					[newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
				}
				return sortedLayers(newLayers);
			}),
		reset: () => set([]) // 全てのIDをリセットする関数
	};
};

/* リストに追加されてるレイヤーID */
export const addedLayerIds = createLayerStore(INT_ADD_LAYER_IDS);

export type Side = 'search' | 'layer' | 'data' | 'info' | 'settings' | null;
/** 表示中のサイドメニューの種類 */
export const isSide = writable<Side>(null);

/** データメニューの表示 */
export const showDataMenu = writable<boolean>(false);

/** インフォメーションの表示 */
export const showInfoDialog = writable<boolean>(false);

/** 利用規約ダイアログの表示 */
export const showTermsDialog = writable<boolean>(false);

/** ストリートビュー */
export const isStreetView = writable<boolean>(false);

/** 選択中のレイヤーid */
export const selectedLayerId = writable<string>('');

export interface SelectedHighlightData {
	layerEntry: GeoDataEntry;
	featureId: number;
}
export const selectedHighlightData = writable<SelectedHighlightData | null>(null);

/** 外部コンポーネントからイベントを発火させるストア */
// const eventStore = () => {
// 	const { subscribe, set } = writable<UseEventTriggerType>('');
// 	return {
// 		subscribe,
// 		trigger: (eventKey: UseEventTriggerType) => {
// 			set(eventKey);
// 			setTimeout(() => set(''), 0);
// 		}
// 	};
// };
// export const useEventTrigger = eventStore();
