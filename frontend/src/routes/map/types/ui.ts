import type { LngLat } from 'maplibre-gl';

/** サイドメニューの種類 */
export type Side = 'search' | 'layer' | 'data' | 'info' | 'settings' | null;

export type BasemapImageTile = {
	Z: number;
	X: number;
	Y: number;
};

/** コンテキストメニューの状態 */
export interface ContextMenuState {
	x: number;
	y: number;
	lngLat: LngLat;
	show: boolean;
}
