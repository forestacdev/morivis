import { writable } from 'svelte/store';

export const isProcessing = writable<boolean>(false);

export type SideMenuType = 'search' | 'layer' | 'data' | 'info' | 'settings' | 'draw' | null;

/** 表示中のサイドメニューの種類 */
export const isSideMenuType = writable<SideMenuType>(null);