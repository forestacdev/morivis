import type { AttributionKey } from '$routes/map/data/attribution';
import { writable } from 'svelte/store';

export const mapAttributions = writable<AttributionKey[]>([]);

interface AttributionItem {
	id: string;
	key: string;
}

// TODO: 使用してない
const createAttributionStore = () => {
	const store = writable<AttributionItem[]>([]);
	const { subscribe, update, set } = store;

	return {
		subscribe,
		add: (attribution: AttributionItem) => {
			update((current) => {
				// 既に同じIDのアイテムが存在する場合は追加しない
				if (current.some((item) => item.id === attribution.id)) {
					return current;
				}
				// 新しいアイテムを配列に追加
				return [...current, attribution];
			});
		},
		remove: (id: string) => {
			update((current) => current.filter((a) => a.id !== id));
		},
		clearAttributions: () => set([])
	};
};

/**
 * レイヤーの出典表示を管理するストア
 * @returns {Object} ストアの操作メソッド
 */
export const layerAttributions = createAttributionStore();
