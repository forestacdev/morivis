import type { UseEventTriggerType } from '$routes/map/types/ui';
import { writable } from 'svelte/store';
import { checkMobile, checkPc, type MobileActiveMenu } from '$routes/map/utils/ui';

/** 処理中の状態 */
export const isProcessing = writable<boolean>(false);

/** スクリーンガードの状態 */
export const isBlocked = writable<boolean>(false);

/** サイドメニューの表示状態 */
export const showOtherMenu = writable<boolean>(false);

/** レイヤーメニューの表示 */
export const showLayerMenu = writable<boolean>(checkPc() ? true : false);

/** データメニューの表示 */
export const showDataMenu = writable<boolean>(false);

/** インフォメーションの表示 */
export const showInfoDialog = writable<boolean>(false);

/** 利用規約ダイアログの表示 */
export const showTermsDialog = writable<boolean>(false);

/** 検索ーメニューの表示 */
export const showSearchMenu = writable<boolean>(false);

/** 検索メニューのサジェスト */
export const showSearchSuggest = writable<boolean>(false);

/** モバイルフッターの状態 */
export const isActiveMobileMenu = writable<MobileActiveMenu>('map');

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
