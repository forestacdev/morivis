import { get, writable } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';
import { type MenuHistoryState, startMenuHistory } from './menu-history';
import type { MobileActiveMenu } from './viewport';

const setup = (mobile = false) => {
	const stores = {
		showLayerMenu: writable(!mobile),
		showDataMenu: writable(false),
		isActiveMobileMenu: writable<MobileActiveMenu>('map'),
		isStreetView: writable(false),
		isStyleEdit: writable(false)
	};
	const historyState = writable<unknown>(undefined);
	const history = {
		push: vi.fn((state: MenuHistoryState) => historyState.set(state)),
		replace: vi.fn((state: MenuHistoryState) => historyState.set(state)),
		subscribe: historyState.subscribe
	};
	const stop = startMenuHistory(stores, history, mobile);
	return { stores, history, restore: historyState.set, stop };
};

const pc = (showDataMenu = false, showLayerMenu = true): MenuHistoryState => ({
	mode: 'pc',
	showLayerMenu,
	showDataMenu
});
const mobile = (
	activeMenu: MobileActiveMenu = 'map',
	isStreetView = false,
	isStyleEdit = false
): MenuHistoryState => ({ mode: 'mobile', activeMenu, isStreetView, isStyleEdit });

describe('menu history', () => {
	it('PCはデータメニューを開いたときだけ履歴を追加する', () => {
		const { stores, history, stop } = setup();
		expect(history.replace).toHaveBeenLastCalledWith(pc());
		expect(history.push).not.toHaveBeenCalled();
		stores.showLayerMenu.set(false);
		stores.showLayerMenu.set(true);
		expect(history.push).not.toHaveBeenCalled();
		stores.showDataMenu.set(true);
		stores.showDataMenu.set(true);
		expect(history.push).toHaveBeenCalledExactlyOnceWith(pc(true));
		stores.showDataMenu.set(false);
		expect(history.replace).toHaveBeenLastCalledWith(pc());
		stop();
	});

	it('PCの戻る・進むで両メニューを復元し、履歴を追加しない', () => {
		const { stores, history, restore, stop } = setup();
		restore(pc(true, false));
		expect(get(stores.showDataMenu)).toBe(true);
		expect(get(stores.showLayerMenu)).toBe(false);
		restore(pc());
		expect(get(stores.showDataMenu)).toBe(false);
		expect(get(stores.showLayerMenu)).toBe(true);
		expect(history.push).not.toHaveBeenCalled();
		// 復元直後の操作をタイマーで捨てない。
		stores.showDataMenu.set(true);
		expect(history.push).toHaveBeenCalledOnce();
		stop();
	});

	it('モバイルのメニュー間移動と閉じる操作は現在の履歴を更新する', () => {
		const { stores, history, restore, stop } = setup(true);
		stores.isActiveMobileMenu.set('layer');
		stores.isActiveMobileMenu.set('data');
		expect(history.push).toHaveBeenCalledExactlyOnceWith(mobile('layer'));
		expect(history.replace).toHaveBeenLastCalledWith(mobile('data'));
		restore(mobile());
		expect(get(stores.isActiveMobileMenu)).toBe('map');
		restore(mobile('data'));
		expect(get(stores.isActiveMobileMenu)).toBe('data');
		stores.isActiveMobileMenu.set('map');
		expect(history.replace).toHaveBeenLastCalledWith(mobile());
		stop();
	});

	it.each(['isStreetView', 'isStyleEdit'] as const)(
		'%sを開くと追加し、戻ると地図へ戻る',
		(key) => {
			const { stores, history, restore, stop } = setup(true);
			stores.isActiveMobileMenu.set('layer');
			stores[key].set(true);
			expect(history.push).toHaveBeenCalledTimes(2);
			restore(mobile('layer'));
			expect(get(stores[key])).toBe(false);
			expect(get(stores.isActiveMobileMenu)).toBe('map');
			expect(history.replace).toHaveBeenLastCalledWith(mobile());
			stop();
		}
	);

	it('モバイルの復元でスタイル編集も適用し、終了時は両モードを解除する', () => {
		const { stores, history, restore, stop } = setup(true);
		restore(mobile('other', true, true));
		expect(get(stores.isStreetView)).toBe(true);
		expect(get(stores.isStyleEdit)).toBe(true);
		restore(mobile('layer'));
		expect(get(stores.isStreetView)).toBe(false);
		expect(get(stores.isStyleEdit)).toBe(false);
		expect(get(stores.isActiveMobileMenu)).toBe('map');
		expect(history.push).not.toHaveBeenCalled();
		stop();
	});

	it.each([null, { mode: 'mobile', activeMenu: 'invalid' }, pc(true)])(
		'不正な状態・別モードの履歴ではモバイルの初期状態へ戻す: %j',
		(value) => {
			const { stores, restore, stop } = setup(true);
			stores.isActiveMobileMenu.set('data');
			restore(value);
			expect(get(stores.isActiveMobileMenu)).toBe('map');
			stop();
		}
	);

	it('URL更新で履歴のUI状態が省略されても開いているメニューを保持する', () => {
		const { stores, history, restore, stop } = setup();
		stores.showDataMenu.set(true);
		restore(undefined);
		expect(get(stores.showDataMenu)).toBe(true);
		expect(history.replace).toHaveBeenLastCalledWith(pc(true));
		expect(history.push).toHaveBeenCalledOnce();
		stop();
	});

	it('破棄後はストアと履歴の双方を監視せず、再表示時も二重購読しない', () => {
		const { stores, history, restore, stop } = setup();
		stop();
		stop();
		history.replace.mockClear();
		stores.showDataMenu.set(true);
		restore(pc());
		expect(get(stores.showDataMenu)).toBe(true);
		expect(history.push).not.toHaveBeenCalled();
		expect(history.replace).not.toHaveBeenCalled();
		const stopAgain = startMenuHistory(stores, history, false);
		stores.showDataMenu.set(false);
		stores.showDataMenu.set(true);
		expect(history.push).toHaveBeenCalledOnce();
		stopAgain();
	});
});
