// 配列を自動ソートする ラスターが下になるように

import { INT_ADD_LAYER_IDS } from '$routes/constants';
import { geoDataEntry } from '$routes/data';
import { writable } from 'svelte/store';

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
					return [id, ...layers];
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
		swapLayers: (fromId: string, toId: string) =>
			update((layers) => {
				const fromIndex = layers.indexOf(fromId);
				const toIndex = layers.indexOf(toId);

				if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return layers;

				const newLayers = [...layers];
				[newLayers[fromIndex], newLayers[toIndex]] = [newLayers[toIndex], newLayers[fromIndex]];
				return newLayers;
			}),
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
				return newLayers;
			}),
		reset: () => set([]) // 全てのIDをリセットする関数
	};
};

/* リストに追加されてるレイヤーID */
export const addedLayerIds = createLayerStore(INT_ADD_LAYER_IDS);

/* リストに追加されてるレイヤーID */
