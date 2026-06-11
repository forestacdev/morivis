import type { GeoDataEntry } from '$routes/map/data/types';
import { shake } from '$routes/map/utils/camera/effects/shake';
import { writable } from 'svelte/store';

const MAX_NOTIFICATIONS = 3;

/** 通知メッセージ */
export type NotificationMessage = {
	id: number;
	message: string;
	type: 'success' | 'info' | 'error' | 'warning' | 'add';
	persistent?: boolean;
	entry?: GeoDataEntry;
};

/** 通知メッセージを表示するストア（最大3件） */
export const notificationMessages = writable<NotificationMessage[]>([]);

let notificationId = 0;

const addNotification = (msg: NotificationMessage) => {
	notificationMessages.update((msgs) => {
		const next = [msg, ...msgs].slice(0, MAX_NOTIFICATIONS);
		return next;
	});
};

export const removeNotification = (id: number) => {
	notificationMessages.update((msgs) => msgs.filter((m) => m.id !== id));
};

export const showNotification = (
	message: NotificationMessage['message'],
	type: NotificationMessage['type'],
	persistent: NotificationMessage['persistent'] = false
) => {
	const msg: NotificationMessage = { id: ++notificationId, message, type, persistent };
	addNotification(msg);
	if (type === 'error') shake();
};

export const showLayerAddedNotification = (entry: GeoDataEntry) => {
	addNotification({
		id: ++notificationId,
		message: entry.metaData.name,
		type: 'add',
		entry
	});
};

export const closeNotification = () => {
	notificationMessages.set([]);
};
