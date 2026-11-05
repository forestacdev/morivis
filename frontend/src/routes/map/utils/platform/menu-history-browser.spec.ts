import { get, writable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	current: {
		route: { id: '/map' },
		state: {} as App.PageState & { testValue?: string; }
	},
	push: vi.fn(),
	replace: vi.fn()
}));

const pageStore = writable(mocks.current);
vi.mock('$app/state', () => ({ page: mocks.current }));
vi.mock(
	'$app/stores',
	() => ({
		page: {
			subscribe: (run: (value: typeof mocks.current) => void) => pageStore.subscribe(run)
		}
	})
);
vi.mock('$app/navigation', () => ({ pushState: mocks.push, replaceState: mocks.replace }));
vi.mock('./viewport', () => ({ checkMobile: () => false, checkPc: () => true }));

import * as ui from '$routes/stores/ui';
import { mountMenuHistory } from './menu-history-browser';

let stop: (() => void) | undefined;

beforeEach(() => {
	mocks.current.route = { id: '/map' };
	mocks.current.state = { testValue: 'test-state' };
	pageStore.set(mocks.current);
	ui.showLayerMenu.set(true);
	ui.showDataMenu.set(false);
	const write = (_url: string, state: App.PageState) => {
		mocks.current.state = state;
		pageStore.set(mocks.current);
	};
	mocks.push.mockReset().mockImplementation(write);
	mocks.replace.mockReset().mockImplementation(write);
});

afterEach(() => {
	stop?.();
	stop = undefined;
});

describe('SvelteKit menu history', () => {
	it('起動を明示し、SvelteKitのAPIで他のpage.stateを保持して書き込む', () => {
		expect(mocks.replace).not.toHaveBeenCalled();
		stop = mountMenuHistory();
		ui.showDataMenu.set(true);
		expect(mocks.push).toHaveBeenCalledExactlyOnceWith('', {
			testValue: 'test-state',
			menuHistory: { mode: 'pc', showLayerMenu: true, showDataMenu: true }
		});
	});

	it('pageの履歴復元通知を受け取り、URL更新ではUIの状態を保持する', () => {
		stop = mountMenuHistory();
		ui.showDataMenu.set(true);
		mocks.current.state = {};
		pageStore.set(mocks.current);
		expect(get(ui.showDataMenu)).toBe(true);
		expect(mocks.current.state.menuHistory).toEqual({
			mode: 'pc',
			showLayerMenu: true,
			showDataMenu: true
		});
		mocks.current.state = {
			menuHistory: { mode: 'pc', showLayerMenu: false, showDataMenu: false }
		};
		pageStore.set(mocks.current);
		expect(get(ui.showDataMenu)).toBe(false);
		expect(get(ui.showLayerMenu)).toBe(false);
		expect(mocks.push).toHaveBeenCalledOnce();
	});

	it('別ページへの遷移中はその履歴を書き換えない', () => {
		stop = mountMenuHistory();
		mocks.replace.mockClear();
		mocks.current.route = { id: '/test-other' };
		mocks.current.state = {};
		pageStore.set(mocks.current);
		ui.showDataMenu.set(true);
		expect(mocks.push).not.toHaveBeenCalled();
		expect(mocks.replace).not.toHaveBeenCalled();
	});

	it('画面破棄後はpageとUIのどちらの変更にも反応しない', () => {
		stop = mountMenuHistory();
		stop();
		mocks.replace.mockClear();
		ui.showDataMenu.set(true);
		mocks.current.state = {};
		pageStore.set(mocks.current);
		expect(get(ui.showDataMenu)).toBe(true);
		expect(mocks.push).not.toHaveBeenCalled();
		expect(mocks.replace).not.toHaveBeenCalled();
	});
});
