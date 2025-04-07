// 配列を自動ソートする ラスターが下になるように

import { writable, derived } from 'svelte/store';

export type LayerType = 'label' | 'point' | 'line' | 'polygon' | 'raster';

const TYPE_ORDER: LayerType[] = ['label', 'point', 'line', 'polygon', 'raster'];

interface GroupedLayers {
	label: string[];
	point: string[];
	line: string[];
	polygon: string[];
	raster: string[];
}

const createLayerStore = () => {
	const initialState: GroupedLayers = {
		label: [],
		point: ['fac_ziriki_point', 'fac_building_point', 'fac_poi'],
		line: ['ensyurin_road2', 'gsi_road'],
		polygon: ['ensyurin_rinhan'],
		raster: ['gsi_rinya_m', 'gsi_seamlessphoto']
	};

	const { subscribe, update, set } = writable<GroupedLayers>({ ...initialState });

	return {
		subscribe,

		// 追加
		add: (id: string, type: LayerType) =>
			update((layers) => {
				if (!layers[type].includes(id)) {
					layers[type] = [id, ...layers[type]];
				}
				return { ...layers };
			}),

		// 削除
		remove: (id: string) =>
			update((layers) => {
				for (const type of TYPE_ORDER) {
					layers[type] = layers[type].filter((l) => l !== id);
				}
				return { ...layers };
			}),

		// 並び替え（タイプ内）
		reorderWithinTypeById: (type: LayerType, fromId: string, toId: string) =>
			update((layers) => {
				const list = [...layers[type]];
				const fromIndex = list.indexOf(fromId);
				const toIndex = list.indexOf(toId);

				// 両方存在し、かつ違う位置でなければ無視
				if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
					return { ...layers };
				}

				const item = list.splice(fromIndex, 1)[0];
				list.splice(toIndex, 0, item);

				layers[type] = list;
				return { ...layers };
			}),

		// 完全リセット
		reset: () => set({ ...initialState })
	};
};

export const groupedLayerStore = createLayerStore();

// Flat表示用 derived store（順序保証付き）
export const orderedLayerIds = derived(groupedLayerStore, ($layers) =>
	TYPE_ORDER.flatMap((type) => $layers[type])
);
