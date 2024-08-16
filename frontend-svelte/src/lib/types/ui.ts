/** サイドメニューの種類 */
export type Side = 'base' | 'raster' | 'vector' | 'info' | null;

/** イベントトリガーの種類 */
export type UseEventTriggerType =
	| ''
	| 'resetLayers' // 初期表示に戻す
	| 'mapload'; // マップの初期化完了
/** 通知メッセージ */
