import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mcaFilesToGlbInWorker } from './analyze';

vi.mock('$app/paths', () => ({ base: '/test-base' }));

const state = vi.hoisted(() => ({
	workers: [] as {
		postMessage: ReturnType<typeof vi.fn>;
		terminate: ReturnType<typeof vi.fn>;
		onmessage?: (event: { data: unknown; }) => void;
	}[]
}));
vi.mock('./worker?worker', () => ({
	default: class {
		postMessage = vi.fn();
		terminate = vi.fn();
		constructor() {
			state.workers.push(this);
		}
	}
}));
beforeEach(() => {
	state.workers.length = 0;
});

describe('MCA一括変換のWorker寿命', () => {
	it('リアクティブな配列Proxyを通常の配列へコピーして送信する', async () => {
		const files = new Proxy([new File([], 'r.0.0.mca')], {});
		const controller = new AbortController();
		const pending = mcaFilesToGlbInWorker(files, {}, controller.signal);
		const sent = state.workers[0].postMessage.mock.calls[0][0];
		expect(sent.files).not.toBe(files);
		expect(sent.files[0]).toBe(files[0]);
		expect(() => structuredClone(sent)).not.toThrow();
		controller.abort();
		await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
	});
	it('全ファイルを一度に渡し、進捗を通知し、終了時にWorkerを解放する', async () => {
		const files = [new File([], 'r.0.0.mca'), new File([], 'r.1.0.mca')];
		const controller = new AbortController();
		const progress = vi.fn();
		const pending = mcaFilesToGlbInWorker(files, {}, controller.signal, progress);
		const worker = state.workers[0];
		expect(worker.postMessage).toHaveBeenCalledWith({
			files,
			options: { resourcePackUrl: '/test-base/minecraft/' }
		});
		const update = {
			fileName: 'r.1.0.mca',
			fileIndex: 2,
			fileCount: 2,
			stage: 'read',
			completed: 0,
			total: 1024
		};
		worker.onmessage?.({ data: { progress: update } });
		expect(progress).toHaveBeenCalledWith(update);
		const result = {
			glb: new ArrayBuffer(0),
			chunkCount: 2,
			blockCount: 2,
			faceCount: 12,
			dataVersions: []
		};
		worker.onmessage?.({ data: { result } });
		await expect(pending).resolves.toEqual(result);
		expect(worker.terminate).toHaveBeenCalledTimes(1);
		controller.abort();
		expect(worker.terminate).toHaveBeenCalledTimes(1);
	});

	it('キャンセル時にWorkerを終了し、AbortErrorで拒否する', async () => {
		const controller = new AbortController();
		const pending = mcaFilesToGlbInWorker([new File([], 'r.0.0.mca')], {}, controller.signal);
		controller.abort();
		await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
		expect(state.workers[0].terminate).toHaveBeenCalledTimes(1);
	});

	it('キャンセル済みならWorkerを作らない', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(mcaFilesToGlbInWorker([], {}, controller.signal)).rejects.toMatchObject({
			name: 'AbortError'
		});
		expect(state.workers).toHaveLength(0);
	});

	it('Workerからのファイル別エラーを呼び出し元へ返す', async () => {
		const pending = mcaFilesToGlbInWorker(
			[new File([], 'r.0.0.mca')],
			{},
			new AbortController().signal
		);
		state.workers[0].onmessage?.({ data: { error: 'r.0.0.mca: test-error' } });
		await expect(pending).rejects.toThrow('r.0.0.mca: test-error');
		expect(state.workers[0].terminate).toHaveBeenCalledTimes(1);
	});
});
