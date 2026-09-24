import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { get, type Writable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isStreetView } from '$routes/stores';
import { isTerrain3d } from '$routes/stores/map';
import { removeUrlParams, set3dParams, setMapParams, setStreetViewParams } from './url-params';

vi.mock('$app/environment', () => ({ browser: true, building: false }));
vi.mock('$app/stores', async () => {
	const { writable } = await import('svelte/store');
	return { page: writable({ url: new URL('https://example.test/') }) };
});
vi.mock('$app/navigation', () => ({
	goto: vi.fn(async (target: string) => {
		const url = new URL(target, window.location.href);
		vi.stubGlobal('window', { location: url });
		(page as unknown as Writable<{ url: URL; }>).set({ url });
	})
}));
vi.mock('$routes/constants', () => ({ MAP_POSITION: {} }));
vi.mock('$routes/stores', async () => {
	const { writable } = await import('svelte/store');
	return { isStreetView: writable(false) };
});
vi.mock('$routes/stores/map', async () => {
	const { writable } = await import('svelte/store');
	return { isTerrain3d: writable(false) };
});

const setTestUrl = (search: string) => {
	const url = new URL(`https://example.test/${search}`);
	vi.stubGlobal('window', { location: url });
	(page as unknown as Writable<{ url: URL; }>).set({ url });
};
const position = { center: [0, 0] as [number, number], zoom: 2, pitch: 0, bearing: 0 };

beforeEach(() => {
	vi.useFakeTimers();
	vi.clearAllMocks();
	setTestUrl('');
	isTerrain3d.set(false);
	isStreetView.set(false);
});

describe('ストリートビューのURLパラメータ', () => {
	it('非表示で地図を移動するとsv=-1を削除する', async () => {
		setTestUrl('?sv=-1&test=keep');
		setMapParams(position);
		await vi.runAllTimersAsync();
		expect(get(page).url.searchParams.has('sv')).toBe(false);
		expect(get(page).url.searchParams.get('test')).toBe('keep');
	});

	it('表示中に地図を移動しても現在の地点IDを保持する', async () => {
		setTestUrl('?sv=1');
		isStreetView.set(true);
		setMapParams(position);
		await vi.runAllTimersAsync();
		expect(get(page).url.searchParams.get('sv')).toBe('1');
	});

	it('地点変更と地図移動をまとめて処理しても新しい地点IDを保持する', async () => {
		setTestUrl('?sv=1');
		isStreetView.set(true);
		setStreetViewParams(2);
		setMapParams(position);
		await vi.runAllTimersAsync();
		expect(get(page).url.searchParams.get('sv')).toBe('2');
	});

	it('終了時にsvを削除し、その後の地図移動でも復活させない', async () => {
		setTestUrl('?sv=1');
		isStreetView.set(true);
		isStreetView.set(false);
		removeUrlParams('sv');
		await vi.runAllTimersAsync();
		expect(get(page).url.searchParams.has('sv')).toBe(false);

		setMapParams(position);
		await vi.runAllTimersAsync();
		expect(get(page).url.searchParams.has('sv')).toBe(false);
	});
});

afterEach(async () => {
	await vi.runAllTimersAsync();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('地形表示のURLパラメータ', () => {
	it('地形オンで3d=1を設定し、オフでURLから削除する', async () => {
		setTestUrl('?test=keep#test-fragment');
		set3dParams('1');
		await vi.runAllTimersAsync();
		expect(get(page).url.searchParams.get('3d')).toBe('1');

		set3dParams('0');
		await vi.runAllTimersAsync();
		expect(get(page).url.searchParams.has('3d')).toBe(false);
		expect(get(page).url.searchParams.get('test')).toBe('keep');
		expect(get(page).url.hash).toBe('#test-fragment');
		expect(goto).toHaveBeenLastCalledWith('?test=keep#test-fragment', {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	});

	it('地形オンのまま地図を移動しても3d=1を保持する', async () => {
		isTerrain3d.set(true);
		set3dParams('1');
		setMapParams(position);
		await vi.runAllTimersAsync();
		expect(get(page).url.searchParams.get('3d')).toBe('1');
	});

	it('地形オフで地図を移動すると古い3d=0も削除する', async () => {
		setTestUrl('?3d=0');
		set3dParams('0');
		setMapParams(position);
		await vi.runAllTimersAsync();
		expect(get(page).url.searchParams.has('3d')).toBe(false);
		expect(get(page).url.searchParams.get('z')).toBe('2.0');
	});

	it('共通の削除処理でも指定したパラメータだけを削除する', async () => {
		setTestUrl('?test-remove=1&test-keep=2');
		removeUrlParams('test-remove');
		await vi.runAllTimersAsync();
		expect(get(page).url.searchParams.has('test-remove')).toBe(false);
		expect(get(page).url.searchParams.get('test-keep')).toBe('2');
	});
});
