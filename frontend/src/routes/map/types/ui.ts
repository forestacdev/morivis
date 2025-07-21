/** サイドメニューの種類 */
export type Side = 'search' | 'layer' | 'data' | 'info' | 'settings' | null;

export type BasemapImageTile = {
	Z: number;
	X: number;
	Y: number;
};

/** イベントトリガーの種類 */
export type UseEventTriggerType = '' | 'setZone'; // 初期表示に戻す
