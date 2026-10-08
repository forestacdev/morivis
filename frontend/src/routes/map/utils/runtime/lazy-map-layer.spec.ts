import type { CustomLayerInterface, Map as MapLibreMap } from '$routes/map/utils/maplibre';
import { describe, expect, it, vi } from 'vitest';
import { createLazyMapLayer } from './lazy-map-layer';

const setup = () => {
	const manager = {
		createLayer: vi.fn(() => ({ id: 'test-layer', type: 'custom' } as CustomLayerInterface)),
		dispose: vi.fn()
	};
	let resolve!: (value: typeof manager) => void;
	let reject!: (error: Error) => void;
	const load = vi.fn(() =>
		new Promise<typeof manager>((yes, no) => {
			resolve = yes;
			reject = no;
		})
	);
	let map = {
		getLayer: vi.fn(() => undefined),
		addLayer: vi.fn(),
		moveLayer: vi.fn(),
		removeLayer: vi.fn()
	};
	const update = vi.fn();
	const runtime = createLazyMapLayer<string, typeof manager>({
		id: 'test-layer',
		getMap: () => map as unknown as MapLibreMap,
		load,
		update,
		beforeId: () => undefined
	});
	return {
		runtime,
		manager,
		load,
		update,
		map,
		resolve: () => resolve(manager),
		reject: () => reject(new Error('test-failure')),
		replaceMap: () => {
			map = { ...map, addLayer: vi.fn() };
		}
	};
};

describe('必要時のカスタムレイヤー読み込み', () => {
	it('通常起動・空の更新・地図スタイル変更・破棄では読み込まない', async () => {
		const s = setup();
		await s.runtime.set([]);
		s.runtime.ensure();
		s.runtime.clear();
		expect(s.load).not.toHaveBeenCalled();
	});
	it('同時ロードを共有し、最新のエントリーだけを適用する', async () => {
		const s = setup();
		const first = s.runtime.set(['test-old']);
		const second = s.runtime.set(['test-new']);
		expect(s.load).toHaveBeenCalledTimes(1);
		s.resolve();
		await Promise.all([first, second]);
		expect(s.update).toHaveBeenCalledExactlyOnceWith(s.manager, ['test-new']);
		expect(s.map.addLayer).toHaveBeenCalledTimes(1);
	});
	it('読み込み中に削除されたレイヤーを復活させない', async () => {
		const s = setup();
		const pending = s.runtime.set(['test-entry']);
		s.runtime.clear();
		s.resolve();
		await pending;
		expect(s.update).not.toHaveBeenCalled();
		expect(s.map.addLayer).not.toHaveBeenCalled();
		await s.runtime.set(['test-retry']);
		expect(s.update).toHaveBeenCalledExactlyOnceWith(s.manager, ['test-retry']);
		expect(s.load).toHaveBeenCalledTimes(1);
	});
	it('地図が置き換わった後に古いロードを反映しない', async () => {
		const s = setup();
		const pending = s.runtime.set(['test-entry']);
		s.replaceMap();
		s.resolve();
		await pending;
		expect(s.update).not.toHaveBeenCalled();
	});
	it('失敗したロードは次の表示要求で再試行する', async () => {
		const s = setup();
		const pending = s.runtime.set(['test-entry']);
		const failure = expect(pending).rejects.toThrow('test-failure');
		s.reject();
		await failure;
		const retry = s.runtime.set(['test-retry']);
		s.resolve();
		await retry;
		expect(s.load).toHaveBeenCalledTimes(2);
		expect(s.map.addLayer).toHaveBeenCalledTimes(1);
	});
});
