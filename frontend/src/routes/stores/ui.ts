import type { UseEventTriggerType } from '$routes/map/types/ui';
import { writable } from 'svelte/store';

/** 処理中の状態 */
export const isProcessing = writable<boolean>(false);

/** スクリーンガードの状態 */
export const isBlocked = writable<boolean>(false);

/** レイヤーメニューの表示 */
export const showLayerMenu = writable<boolean>(true);

/** 検索ーメニューの表示 */
export const showSearchMenu = writable<boolean>(false);

/** 検索メニューのサジェスト */
export const showSearchSuggest = writable<boolean>(false);

export const isMobile = writable<boolean>(false);

/** 外部コンポーネントからイベントを発火させるストア */
const eventStore = () => {
	const { subscribe, set } = writable<UseEventTriggerType>('');
	return {
		subscribe,
		trigger: (eventKey: UseEventTriggerType) => {
			set(eventKey);
			setTimeout(() => set(''), 0);
		}
	};
};
export const useEventTrigger = eventStore();
