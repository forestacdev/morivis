import { writable } from 'svelte/store';

/** 処理中の状態 */
export const isProcessing = writable<boolean>(false);

/** スクリーンガードの状態 */
export const isBlocked = writable<boolean>(false);

export type SideMenuType = 'search' | 'layer' | 'data' | 'info' | 'settings' | 'draw' | null;

/** 表示中のサイドメニューの種類 */
export const isSideMenuType = writable<SideMenuType>(null);
