import type { LngLat } from 'maplibre-gl';

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
