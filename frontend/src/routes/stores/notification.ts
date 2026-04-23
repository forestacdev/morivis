import { writable } from 'svelte/store';
import type { GeoDataEntry } from '$routes/map/data/types';
import { shake } from '$routes/map/utils/camera/effects/shake';

/** 通知メッセージ */
type NotificationMessage = {
	id: number;
	message: string;
	type: 'success' | 'info' | 'error' | 'warning' | 'add';
	persistent?: boolean;
	entry?: GeoDataEntry;
};
/** 通知メッセージを表示するストア */
export const notificationMessage = writable<NotificationMessage | null>(null);

let notificationId = 0;

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
	notificationMessage.set({ id: ++notificationId, message, type, persistent });
	if (type === 'error') shake();
};

/**
 * レイヤー追加通知を表示する
 */
export const showLayerAddedNotification = (entry: GeoDataEntry) => {
	notificationMessage.set({
		id: ++notificationId,
		message: entry.metaData.name,
		type: 'add',
		entry
	});
};

/**
 * 通知メッセージを閉じる
 */
export const closeNotification = () => {
	notificationMessage.set(null);
};
