import { writable } from 'svelte/store';
/** 通知メッセージ */
type NotificationMessage = {
	message: string;
	type: 'success' | 'info' | 'error' | 'warning';
	persistent?: boolean;
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
};

/**
 * 通知メッセージを閉じる
 */
export const closeNotification = () => {
	notificationMessage.set(null);
};
