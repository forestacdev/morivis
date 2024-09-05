import { writable } from 'svelte/store';
import type { Side } from '$lib/types/ui';
import { INT_ADD_LAYER_IDS } from '$lib/constants';
import type { UserInfo } from 'firebase/auth';

export const authStore = writable({ loggedIn: false, user: null as UserInfo });

/* クリックイベントを除外するレイヤーID */
export const excludeIdsClickLayer = writable<string[]>(['HighlightFeatureId']);
export const clickableLayerIds = writable<string[]>([]); /* クリックイベントを発火するレイヤーID */

/* リストに追加されてるレイヤーID */

const createLayerStore = (initialLayers: string[] = []) => {
	const { subscribe, set, update } = writable<string[]>(initialLayers);

	return {
		subscribe,
		addLayer: (id: string) =>
			update((layers) => {
				if (!layers.includes(id)) {
					return [...layers, id];
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
				return newLayers;
			}),
		reset: () => set([]) // 全てのIDをリセットする関数
	};
};

export const addedLayerIds = createLayerStore(INT_ADD_LAYER_IDS);

/** 表示中のサイドメニューの種類 */
export const isSide = writable<Side>(null);
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
