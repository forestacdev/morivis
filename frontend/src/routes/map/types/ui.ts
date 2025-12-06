import type { LngLat } from 'maplibre-gl';

/** サイドメニューの種類 */
export type Side = 'search' | 'layer' | 'data' | 'info' | 'settings' | null;

export type BasemapImageTile = {
	Z: number;
	X: number;
	Y: number;
};

/** イベントトリガーの種類 */
export type UseEventTriggerType = '' | 'setZone'; // 初期表示に戻す

/** コンテキストメニューの状態 */
export interface ContextMenuState {
	x: number;
	y: number;
	lngLat: LngLat;
	show: boolean;
}
