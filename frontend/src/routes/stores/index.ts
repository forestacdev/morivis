import { writable } from 'svelte/store';
import { INT_ADD_LAYER_IDS } from '$routes/constants';

import { geoDataEntries } from '$routes/map/data';
import type { FeatureCollection, Feature } from 'geojson';
import type { GeoDataEntry } from '$routes/map/data/types';
import type { MapGeoJSONFeature } from 'maplibre-gl';
import type { Side } from 'three';

/* クリックイベントを除外するレイヤーID */
export const excludeIdsClickLayer = writable<string[]>(['HighlightFeatureId']);

/**  クリックイベントを発火するベクターレイヤーID */
export const clickableVectorIds = writable<string[]>([]);

/* クリックイベントを発火するラスターレイヤーID */
export const clickableRasterIds = writable<string[]>([]);

/**  デバッグモード */
export const DEBUG_MODE = writable<boolean>(false);

/**  地図のモード */
export const mapMode = writable<'view' | 'small'>('view');

/** サイドメニューの表示状態 */
export const showSideMenu = writable<boolean>(false);

/** スタイル編集モード */
export const isStyleEdit = writable<boolean>(false);

/** データメニューの表示 */
export const showDataMenu = writable<boolean>(false);

/** 地形メニュー */
export const showTerrainMenu = writable<boolean>(false);

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
