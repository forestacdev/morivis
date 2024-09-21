import { writable } from 'svelte/store';
import type { Side } from '$lib/types/ui';
import { INT_ADD_LAYER_IDS } from '$lib/constants';
import type { UserInfo } from 'firebase/auth';
import { layerData } from '$lib/data/layers';

export const authStore = writable({ loggedIn: false, user: null as UserInfo });

/* クリックイベントを除外するレイヤーID */
export const excludeIdsClickLayer = writable<string[]>(['HighlightFeatureId']);
export const clickableLayerIds = writable<string[]>([]); /* クリックイベントを発火するレイヤーID */

/* リストに追加されてるレイヤーID */

const sortedLayers = (Layers: string[]) => {
	const raster = [];
	const vector = [];

	Layers.forEach((layerId) => {
		// typeを調べる
		const layer = layerData.find((entry) => entry.id === layerId);

		if (layer?.dataType === 'raster' && !layer.isOverVector) {
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
		removeLayer: (id: string) => update((layers) => layers.filter((layerId) => layerId !== id)),
		reorderLayer: (id: string, direction: 'up' | 'down') =>
			update((layers) => {
				const index = layers.indexOf(id);
				if (index === -1) return layers; // IDが見つからない場合は何もしない

				const newLayers = [...layers];
				if (direction === 'up' && index > 0) {
					// 上に移動（配列の前方に移動）
					[newLayers[index - 1], newLayers[index]] = [
						newLayers[index],
						newLayers[index - 1]
					];
				} else if (direction === 'down' && index < layers.length - 1) {
					// 下に移動（配列の後方に移動）
					[newLayers[index], newLayers[index + 1]] = [
						newLayers[index + 1],
						newLayers[index]
					];
				}
				return sortedLayers(newLayers);
			}),
		reset: () => set([]) // 全てのIDをリセットする関数
	};
};

export const addedLayerIds = createLayerStore(INT_ADD_LAYER_IDS);

/** 表示中のサイドメニューの種類 */
// export const isSide = writable<Side>(null);
export const isSide = writable<Side>(null);
export const showDataMenu = writable<boolean>(false);
export const showlayerOptionId = writable<string>('');

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
