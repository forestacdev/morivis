import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDgn } from './definition';

interface TestWorker {
	onmessage: ((event: MessageEvent) => void) | null;
	onerror: (() => void) | null;
	onmessageerror: (() => void) | null;
	postMessage: ReturnType<typeof vi.fn>;
	terminate: ReturnType<typeof vi.fn>;
}
const state = vi.hoisted(() => ({ workers: [] as TestWorker[] }));
vi.mock('./worker?worker', () => ({
	default: class {
		onmessage = null;
		onerror = null;
		onmessageerror = null;
		postMessage = vi.fn();
		terminate = vi.fn();
		constructor() {
			state.workers.push(this);
		}
	}
}));
import { runDgnWorker } from './analyze';
afterEach(() => {
	state.workers.length = 0;
	vi.useRealTimers();
});
const request = () => ({ file: new File(['test'], 'test-drawing.dgn') });

describe('DGN Workerの終了処理', () => {
	it('正常終了時にWorkerを終了する', async () => {
		const promise = runDgnWorker(request(), new AbortController().signal);
		const result = {
			geojson: { type: 'FeatureCollection', features: [] },
			spatialStatus: 'crs-missing',
			omittedCount: 0
		};
		state.workers[0].onmessage?.({ data: { result } } as MessageEvent);
		expect(await promise).toEqual(result);
		expect(state.workers[0].terminate).toHaveBeenCalledOnce();
	});
	it('入力変更・キャンセルでWorkerを終了し、結果を登録させない', async () => {
		const controller = new AbortController();
		const promise = runDgnWorker(request(), controller.signal);
		controller.abort();
		await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
		expect(state.workers[0].terminate).toHaveBeenCalledOnce();
	});
	it('制限時間でもWorkerを終了する', async () => {
		vi.useFakeTimers();
		const promise = runDgnWorker(request(), new AbortController().signal);
		const rejected = expect(promise).rejects.toThrow('図面を分割');
		vi.advanceTimersByTime(formatDgn.limits.timeoutMs);
		await rejected;
		expect(state.workers[0].terminate).toHaveBeenCalledOnce();
	});
	it.each(['onerror', 'onmessageerror'] as const)('%sでも後処理する', async event => {
		const promise = runDgnWorker(request(), new AbortController().signal);
		state.workers[0][event]?.();
		await expect(promise).rejects.toThrow('DGN');
		expect(state.workers[0].terminate).toHaveBeenCalledOnce();
	});
	it('解析エラーをフォームへ返す', async () => {
		const promise = runDgnWorker(request(), new AbortController().signal);
		state.workers[0].onmessage?.({ data: { error: 'test-dgn-error' } } as MessageEvent);
		await expect(promise).rejects.toThrow('test-dgn-error');
		expect(state.workers[0].terminate).toHaveBeenCalledOnce();
	});
	it('上限超過と中止済みの入力はWorker起動前に拒否する', () => {
		expect(() =>
			runDgnWorker(
				{ file: { size: formatDgn.limits.maxFileBytes + 1 } as File },
				new AbortController().signal
			)
		).toThrow('64 MiB');
		const controller = new AbortController();
		controller.abort();
		expect(() => runDgnWorker(request(), controller.signal)).toThrow();
		expect(state.workers).toHaveLength(0);
	});
});
