import { get, writable } from 'svelte/store';
import { INT_ADD_LAYER_IDS } from '$map/constants';
import { geoDataEntry } from '$map/data';

/* クリックイベントを除外するレイヤーID */
export const excludeIdsClickLayer = writable<string[]>(['HighlightFeatureId']);
export const clickableLayerIds = writable<string[]>([]); /* クリックイベントを発火するレイヤーID */

export const DEBUG_MODE = writable<boolean>(false); /* デバッグモード */
export const EDIT_MODE = writable<boolean>(false); /* 編集モード */
/* リストに追加されてるレイヤーID */

// 配列を自動ソートする ラスターが下になるように
const sortedLayers = (Layers: string[]) => {
	const raster: string[] = [];
	const vector: string[] = [];
	Layers.forEach((layerId) => {
		// typeを調べる
		const data = geoDataEntry[layerId];
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

export const addedLayerIds = createLayerStore(INT_ADD_LAYER_IDS);

export type Side = 'search' | 'layer' | 'data' | 'info' | 'settings' | null;
/** 表示中のサイドメニューの種類 */
export const isSide = writable<Side>(null);
export const showDataMenu = writable<boolean>(false);
export const showLayerOptionId = writable<string>('');

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
