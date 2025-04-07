import { writable } from 'svelte/store';
import { INT_ADD_LAYER_IDS } from '$routes/constants';

import { geoDataEntry } from '$routes/data';
import type { FeatureCollection, Feature } from 'geojson';
import type { GeoDataEntry } from '$routes/data/types';
import type { MapGeoJSONFeature } from 'maplibre-gl';

/* クリックイベントを除外するレイヤーID */
export const excludeIdsClickLayer = writable<string[]>(['HighlightFeatureId']);

/**  クリックイベントを発火するベクターレイヤーID */
export const clickableVectorIds = writable<string[]>([]);

/* クリックイベントを発火するラスターレイヤーID */
export const clickableRasterIds = writable<string[]>([]);

/**  レイヤーの出典表示 */
export const layerAttributions = writable<string[]>([]);

/**  デバッグモード */
export const DEBUG_MODE = writable<boolean>(false);

/**  地図のモード */
export const mapMode = writable<'view' | 'edit' | 'analysis' | 'small'>('view');

/**  3D地形 */
export const isTerrain3d = writable<boolean>(true);

/** ストリートビューレイヤー */
export const showStreetViewLayer = writable<boolean>(false);

/** サイドメニューの表示状態 */
export const showSideMenu = writable<boolean>(false);

/** TODO:編集モード */
export const isEdit = writable<boolean>(false);

export type Side = 'search' | 'layer' | 'data' | 'info' | 'settings' | null;
/** 表示中のサイドメニューの種類 */
export const isSide = writable<Side>(null);

/** データメニューの表示 */
export const showDataMenu = writable<boolean>(false);

/** インフォメーションの表示 */
export const showInfoDialog = writable<boolean>(false);

/** 利用規約ダイアログの表示 */
export const showTermsDialog = writable<boolean>(false);

/** ストリートビュー */
export const isStreetView = writable<boolean>(false);

/** 選択中のレイヤーid */
export const selectedLayerId = writable<string>('');

export interface SelectedHighlightData {
	layerEntry: GeoDataEntry;
	featureId: number;
}
export const selectedHighlightData = writable<SelectedHighlightData | null>(null);
