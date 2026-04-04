import { writable } from 'svelte/store';
import { shake, pulseZoom } from '$routes/map/utils/camera-effects';
import type { GeoDataEntry } from '$routes/map/data/types';

/** 通知メッセージ */
type NotificationMessage = {
	message: string;
	type: 'success' | 'info' | 'error' | 'warning' | 'add';
	persistent?: boolean;
	entry?: GeoDataEntry;
};
/** 通知メッセージを表示するストア */
export const notificationMessage = writable<NotificationMessage | null>(null);

/**
 * 通知メッセージを表示する
 * @param message メッセージ
 * @param type タイプ
 * @param persistent メッセージを固定するかどうか(オプショナル)
 */
export const showNotification = (
	message: NotificationMessage['message'],
	type: NotificationMessage['type'],
	persistent: NotificationMessage['persistent'] = false
) => {
	notificationMessage.set({ message, type, persistent });
	if (type === 'error') shake();
};

/**
 * レイヤー追加通知を表示する
 */
export const showLayerAddedNotification = (entry: GeoDataEntry) => {
	notificationMessage.set({ message: entry.metaData.name, type: 'add', entry });
};

/**
 * 通知メッセージを閉じる
 */
export const closeNotification = () => {
	notificationMessage.set(null);
};
