import type { GeoDataEntry } from '$routes/map/data/types';
import { writable, derived, get } from 'svelte/store';
import { GeojsonCache } from '$routes/map/utils/file/geojson';

// 配列を自動ソートする ラスターが下になるように
export type LayerType = 'label' | 'point' | 'line' | 'polygon' | 'raster';

const TYPE_ORDER: LayerType[] = ['label', 'point', 'line', 'polygon', 'raster'];

interface GroupedLayers {
	label: string[];
	point: string[];
	line: string[];
	polygon: string[];
	raster: string[];
}

export type ReorderStatus = 'idle' | 'success' | 'invalid';

export const reorderStatus = writable<ReorderStatus>('idle');

const createLayerStore = () => {
	// const initialState: GroupedLayers = {
	// 	label: [],
	// 	point: [],
	// 	line: [],
	// 	polygon: [],
	// 	raster: ['ensyurin_dem']
	// };

	const initialState: GroupedLayers = {
		label: [],
		point: [],
		line: ['ensyurin_road2'],
		polygon: ['ensyurin_rinhan'],
		raster: ['ensyurin_photo']
	};

	const store = writable<GroupedLayers>({ ...initialState });
	const { subscribe, update, set } = store;

	return {
		subscribe,

		setLayers: (layers: GroupedLayers) => {
			// GeojsonCacheの初期化
			GeojsonCache.clear();
			// ストアの値を更新
			set({ ...layers }); // または set((state) => ({ ...state, layers }))
		},

		// 追加
		add: (id: string, type: LayerType) =>
			update((layers) => {
				if (!layers[type].includes(id)) {
					layers[type] = [id, ...layers[type]];
				}
				return { ...layers };
			}),
		getType: (id: string): LayerType | undefined => {
			const layers = get(store); // ✅ ストアの現在値を取得
			for (const type of TYPE_ORDER) {
				if (layers[type].includes(id)) {
					return type;
				}
			}
			return undefined;
		},

		// 削除
		remove: (id: string) =>
			update((layers) => {
				for (const type of TYPE_ORDER) {
					layers[type] = layers[type].filter((l) => l !== id);
				}

				if (GeojsonCache.has(id)) GeojsonCache.remove(id);

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
					reorderStatus.set('invalid');
					return { ...layers };
				}

				const item = list.splice(fromIndex, 1)[0];
				list.splice(toIndex, 0, item);

				layers[type] = list;
				reorderStatus.set('success');
				return { ...layers };
			}),

		// 完全リセット
		reset: () => set({ ...initialState })
	};
};

export const groupedLayerStore = createLayerStore();

/** レイヤーidリスト Flat */
export const orderedLayerIds = derived(groupedLayerStore, ($layers) =>
	TYPE_ORDER.flatMap((type) => $layers[type])
);

/** レイヤータイプごとの区切りのインデックス */
export const typeBreakIndices = derived(groupedLayerStore, ($layers) => {
	const breaks: { [index: number]: LayerType } = {};
	let index = 0;

	for (const type of TYPE_ORDER) {
		const items = $layers[type];
		if (items.length > 0) {
			breaks[index] = type;
			index += items.length;
		}
	}

	return breaks;
});

/** 道路レイヤー */
export const showLoadLayer = writable<boolean>(true);

/** 行政境界レイヤー */
export const showBoundaryLayer = writable<boolean>(false);

/** 等高線レイヤー */
export const showContourLayer = writable<boolean>(false);

/** ラベルレイヤー */
export const showLabelLayer = writable<boolean>(true);

/** 陰影レイヤー */
export const showHillshadeLayer = writable<boolean>(false);

/** ストリートビューレイヤー */
export const showStreetViewLayer = writable<boolean>(false);

/** レイヤータイプの取得 */
export const getLayerType = (_dataEntry: GeoDataEntry): LayerType | undefined => {
	if (_dataEntry.type === 'raster') {
		return 'raster';
	} else if (_dataEntry.type === 'vector') {
		if (_dataEntry.format.geometryType === 'Point') {
			return 'point';
		} else if (_dataEntry.format.geometryType === 'LineString') {
			return 'line';
		} else if (_dataEntry.format.geometryType === 'Polygon') {
			return 'polygon';
		}
	} else {
		throw new Error(`Unknown layer type: ${_dataEntry}`);
	}
};

export const getLayersGroup = (layerEntries: GeoDataEntry[]): GroupedLayers => {
	const grouped: GroupedLayers = {
		label: [],
		point: [],
		line: [],
		polygon: [],
		raster: []
	};

	for (const entry of layerEntries) {
		const type = getLayerType(entry);
		if (type) {
			grouped[type].push(entry.id);
		}
	}

	return grouped;
};
