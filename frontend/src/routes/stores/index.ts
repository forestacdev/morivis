import { PUBLIC_INIT_DEBUG_MODE } from '$env/static/public';
import { writable } from 'svelte/store';

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

/** 選択中のレイヤーid */
export const selectedLayerId = writable<string>('');

export interface SelectedHighlightData {
	layerId: MorivisLayerEntry['id'];
	featureId: string | number;
}

/** ハイライトの選択状態 */
export const selectedHighlightData = writable<SelectedHighlightData | null>(null);
