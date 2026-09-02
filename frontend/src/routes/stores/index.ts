import { PUBLIC_INIT_DEBUG_MODE } from '$env/static/public';
import { derived, writable } from 'svelte/store';

import type { MorivisLayerEntry } from '$routes/map/data/types';

/**  デバッグモード 開発時のみ */
export const isDebugMode = writable<boolean>(PUBLIC_INIT_DEBUG_MODE === '1');

/* クリックイベントを除外するレイヤーID */
export const excludeIdsClickLayer = writable<string[]>(['HighlightFeatureId']);

/**  クリックイベントを発火するベクターレイヤーID */
export const clickableVectorIds = writable<string[]>([]);

/* クリックイベントを発火するラスターレイヤーID */
export const clickableRasterIds = writable<string[]>([]);

/**  地図のモード */
export const mapMode = writable<'view' | 'small'>('view');

/** スタイル編集モード */
export const isStyleEdit = writable<boolean>(false);

/** ストリートビュー */
export const isStreetView = writable<boolean>(false);

/** 単体表示中の3DモデルID */
export const modelViewEntryId = writable<string | null>(null);

/** 単体3Dモデルビューの表示状態 */
export const isModelView = derived(modelViewEntryId, (entryId) => entryId !== null);

export const openModelView = (entryId: string) => {
	isStreetView.set(false);
	modelViewEntryId.set(entryId);
};

export const closeModelView = () => {
	modelViewEntryId.set(null);
};

/** 選択中のレイヤーid */
export const selectedLayerId = writable<string>('');

export interface SelectedHighlightData {
	layerId: MorivisLayerEntry['id'];
	featureId: string | number;
}

/** ハイライトの選択状態 */
export const selectedHighlightData = writable<SelectedHighlightData | null>(null);
