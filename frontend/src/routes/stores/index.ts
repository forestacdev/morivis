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

export interface ModelViewCamera {
	type: 'orthographic' | 'perspective';
	position: [number, number, number];
	direction: [number, number, number];
	up: [number, number, number];
	viewToWorldScale?: number;
	fieldOfView?: number;
}

interface ModelViewRequest {
	entryIds: string[];
	camera?: ModelViewCamera;
	includeHighlights?: boolean;
}

/** 単体表示する3Dモデルと、必要に応じてBCFが指定する初期視点 */
export const modelViewRequest = writable<ModelViewRequest | null>(null);

/** 単体3Dモデルビューの表示状態 */
export const isModelView = derived(modelViewRequest, (request) => request !== null);

export const openModelView = (entryId: string) => {
	isStreetView.set(false);
	modelViewRequest.set({ entryIds: [entryId] });
};

/** 地図で選択したIFC部材のハイライトを維持して単体ビューを開く。 */
export const openHighlightedModelView = (entryId: string) => {
	isStreetView.set(false);
	modelViewRequest.set({ entryIds: [entryId], includeHighlights: true });
};

export const openBcfModelView = (entryIds: string[], camera: ModelViewCamera) => {
	isStreetView.set(false);
	modelViewRequest.set({ entryIds, camera, includeHighlights: true });
};

export const closeModelView = () => {
	modelViewRequest.set(null);
};

/** 選択中のレイヤーid */
export const selectedLayerId = writable<string>('');

export interface SelectedHighlightData {
	layerId: MorivisLayerEntry['id'];
	featureId: string | number;
}

/** ハイライトの選択状態 */
export const selectedHighlightData = writable<SelectedHighlightData | null>(null);
