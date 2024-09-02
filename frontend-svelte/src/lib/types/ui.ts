/** サイドメニューの種類 */
export type Side = 'base' | 'layer' | 'vector' | 'info' | 'settings' | null;

export type BasemapImageTile = {
	Z: number;
	X: number;
	Y: number;
};

/** イベントトリガーの種類 */
export type UseEventTriggerType =
	| ''
	| 'resetLayers' // 初期表示に戻す
	| 'mapload'; // マップの初期化完了
/** 通知メッセージ */
