import { writable } from 'svelte/store';
import type { Side } from '$lib/types/ui';

import type { UserInfo } from 'firebase/auth';

export const authStore = writable({ loggedIn: false, user: null as UserInfo });

/* クリックイベントを除外するレイヤーID */
export const excludeIdsClickLayer = writable<string[]>(['HighlightFeatureId']);

/** 表示中のサイドメニューの種類 */
export const isSide = writable<Side>(null);
export const showlayerOptionId = writable<string>('');

/** 外部コンポーネントからイベントを発火させるストア */
// const eventStore = () => {
// 	const { subscribe, set } = writable<UseEventTriggerType>('');
// 	return {
// 		subscribe,
// 		trigger: (eventKey: UseEventTriggerType) => {
// 			set(eventKey);
// 			setTimeout(() => set(''), 0);
// 		}
// 	};
// };
// export const useEventTrigger = eventStore();
