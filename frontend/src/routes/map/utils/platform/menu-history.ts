import { get, type Writable } from 'svelte/store';
import type { MobileActiveMenu } from './viewport';

export type MenuHistoryState = {
	mode: 'pc';
	showLayerMenu: boolean;
	showDataMenu: boolean;
} | {
	mode: 'mobile';
	activeMenu: MobileActiveMenu;
	isStreetView: boolean;
	isStyleEdit: boolean;
};

type MenuStores = {
	showLayerMenu: Writable<boolean>;
	showDataMenu: Writable<boolean>;
	isActiveMobileMenu: Writable<MobileActiveMenu>;
	isStreetView: Writable<boolean>;
	isStyleEdit: Writable<boolean>;
};

export type MenuHistory = {
	push: (state: MenuHistoryState) => void;
	replace: (state: MenuHistoryState) => void;
	subscribe: (restore: (state: unknown) => void) => () => void;
};

const isMenuHistoryState = (value: unknown): value is MenuHistoryState => {
	if (!value || typeof value !== 'object') return false;
	if (!('mode' in value)) return false;
	if (value.mode === 'pc') {
		return 'showLayerMenu' in value && typeof value.showLayerMenu === 'boolean'
			&& 'showDataMenu' in value && typeof value.showDataMenu === 'boolean';
	}
	return value.mode === 'mobile'
		&& 'activeMenu' in value
		&& typeof value.activeMenu === 'string'
		&& ['map', 'layer', 'data', 'other'].includes(value.activeMenu)
		&& 'isStreetView' in value && typeof value.isStreetView === 'boolean'
		&& 'isStyleEdit' in value && typeof value.isStyleEdit === 'boolean';
};

const equals = (a: MenuHistoryState, b: MenuHistoryState) => {
	if (a.mode === 'pc' && b.mode === 'pc') {
		return a.showLayerMenu === b.showLayerMenu && a.showDataMenu === b.showDataMenu;
	}
	return a.mode === 'mobile' && b.mode === 'mobile'
		&& a.activeMenu === b.activeMenu && a.isStreetView === b.isStreetView
		&& a.isStyleEdit === b.isStyleEdit;
};

const shouldPush = (previous: MenuHistoryState, next: MenuHistoryState) => {
	if (previous.mode === 'pc' && next.mode === 'pc') {
		return !previous.showDataMenu && next.showDataMenu;
	}
	return previous.mode === 'mobile' && next.mode === 'mobile'
		&& ((previous.activeMenu === 'map' && next.activeMenu !== 'map')
			|| (!previous.isStreetView && next.isStreetView)
			|| (!previous.isStyleEdit && next.isStyleEdit));
};

/** 地図画面が所有する購読。返り値を画面破棄時に呼ぶ。 */
export const startMenuHistory = (
	stores: MenuStores,
	history: MenuHistory,
	mobile: boolean
): () => void => {
	const read = (): MenuHistoryState =>
		mobile
			? {
				mode: 'mobile',
				activeMenu: get(stores.isActiveMobileMenu),
				isStreetView: get(stores.isStreetView),
				isStyleEdit: get(stores.isStyleEdit)
			}
			: {
				mode: 'pc',
				showLayerMenu: get(stores.showLayerMenu),
				showDataMenu: get(stores.showDataMenu)
			};
	const defaultState: MenuHistoryState = mobile
		? { mode: 'mobile', activeMenu: 'map', isStreetView: false, isStyleEdit: false }
		: { mode: 'pc', showLayerMenu: true, showDataMenu: false };
	let previous = read();
	let restoring = false;
	let stopped = false;

	const apply = (state: MenuHistoryState) => {
		restoring = true;
		try {
			if (state.mode === 'pc') {
				stores.showLayerMenu.set(state.showLayerMenu);
				stores.showDataMenu.set(state.showDataMenu);
			} else {
				stores.isActiveMobileMenu.set(state.activeMenu);
				stores.isStreetView.set(state.isStreetView);
				stores.isStyleEdit.set(state.isStyleEdit);
			}
			previous = read();
		} finally {
			restoring = false;
		}
	};

	const onChange = () => {
		if (stopped || restoring) return;
		const next = read();
		if (equals(previous, next)) return;
		const push = shouldPush(previous, next);
		previous = next;
		if (push) history.push(next);
		else history.replace(next);
	};

	history.replace(previous);
	const watchedStores = mobile
		? [stores.isActiveMobileMenu, stores.isStreetView, stores.isStyleEdit]
		: [stores.showLayerMenu, stores.showDataMenu];
	const unsubscribers = watchedStores.map(store => store.subscribe(onChange));
	unsubscribers.push(history.subscribe((value) => {
		if (stopped || restoring) return;
		// URLパラメータの更新などでpage.stateが省略された場合も現在のUIを保持する。
		if (value === undefined) {
			history.replace(previous);
			return;
		}
		const target = isMenuHistoryState(value) && value.mode === previous.mode
			? value
			: defaultState;
		if (equals(previous, target)) return;
		// モバイルでは編集・ストリートビューを閉じる操作を優先する。
		const next = previous.mode === 'mobile' && (previous.isStreetView || previous.isStyleEdit)
			? defaultState
			: target;
		apply(next);
		if (!equals(next, target)) history.replace(previous);
	}));

	return () => {
		if (stopped) return;
		stopped = true;
		unsubscribers.forEach(unsubscribe => unsubscribe());
	};
};
