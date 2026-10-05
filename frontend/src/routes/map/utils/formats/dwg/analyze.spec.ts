import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeDwgFileInWorker } from './analyze';

const state = vi.hoisted(() => ({
	workers: [] as {
		terminate: ReturnType<typeof vi.fn>;
		postMessage: ReturnType<typeof vi.fn>;
		onerror: (event: Partial<ErrorEvent>) => void;
	}[]
}));
vi.mock('./worker?worker', () => ({
	default: class {
		terminate = vi.fn();
		postMessage = vi.fn();
		onerror = (_event: Partial<ErrorEvent>) => {};
		constructor() {
			state.workers.push(this);
		}
	}
}));
const file = () => new File([new Uint8Array([0, 1, 2])], 'test.dwg');
afterEach(() => {
	state.workers.length = 0;
	vi.useRealTimers();
});

describe('DWG Workerの終了', () => {
	it.each([undefined, '', 'Failed to load module'])(
		'Worker起動エラーの詳細 %s を通知して終了する',
		async message => {
			const result = analyzeDwgFileInWorker(file());
			const rejected = expect(result).rejects.toThrow(message || 'Workerの異常終了');
			await vi.waitFor(() => expect(state.workers).toHaveLength(1));
			state.workers[0].onerror({ message });
			await rejected;
			expect(state.workers[0].terminate).toHaveBeenCalledOnce();
		}
	);
	it('キャンセル時は変換Workerを終了する', async () => {
		const controller = new AbortController();
		const result = analyzeDwgFileInWorker(file(), 'm', controller.signal);
		const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
		await vi.waitFor(() => expect(state.workers).toHaveLength(1));
		controller.abort();
		await rejected;
		expect(state.workers[0].terminate).toHaveBeenCalledOnce();
	});
	it('長時間の変換を自動停止せず、キャンセルで終了できる', async () => {
		vi.useFakeTimers();
		const controller = new AbortController();
		const result = analyzeDwgFileInWorker(file(), 'auto', controller.signal);
		const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
		await vi.waitFor(() => expect(state.workers).toHaveLength(1));
		await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
		expect(state.workers[0].terminate).not.toHaveBeenCalled();
		controller.abort();
		await rejected;
		expect(state.workers[0].terminate).toHaveBeenCalledOnce();
	});
	it('キャンセル済みならWorkerを起動しない', async () => {
		await expect(analyzeDwgFileInWorker(file(), 'auto', AbortSignal.abort())).rejects
			.toMatchObject({ name: 'AbortError' });
		expect(state.workers).toHaveLength(0);
	});
});
