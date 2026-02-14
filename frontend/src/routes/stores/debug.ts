import { writable } from 'svelte/store';

export type DebugLogEntry = {
	timestamp: Date;
	message: string;
	level: 'info' | 'warn' | 'error';
};

/** デバッグログのストア */
const createDebugLogStore = () => {
	const { subscribe, update, set } = writable<DebugLogEntry[]>([]);

	return {
		subscribe,
		/** ログを追加する */
		log: (message: string, level: DebugLogEntry['level'] = 'info') => {
			update((logs) => [...logs, { timestamp: new Date(), message, level }]);
		},
		/** infoレベルのログを追加する */
		info: (message: string) => {
			update((logs) => [...logs, { timestamp: new Date(), message, level: 'info' }]);
		},
		/** warnレベルのログを追加する */
		warn: (message: string) => {
			update((logs) => [...logs, { timestamp: new Date(), message, level: 'warn' }]);
		},
		/** errorレベルのログを追加する */
		error: (message: string) => {
			update((logs) => [...logs, { timestamp: new Date(), message, level: 'error' }]);
		},
		/** ログをクリアする */
		clear: () => {
			set([]);
		}
	};
};

export const debugLog = createDebugLogStore();
