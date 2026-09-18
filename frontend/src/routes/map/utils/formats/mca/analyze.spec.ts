import { beforeEach, describe, expect, it, vi } from 'vitest';

const worker = vi.hoisted(() => ({
	postMessage: vi.fn(),
	terminate: vi.fn(),
	onmessage: null as ((event: { data: unknown; }) => void) | null,
	onerror: null as ((event: { message: string; }) => void) | null,
	onmessageerror: null as (() => void) | null
}));
vi.mock('./worker?worker', () => ({ default: vi.fn(() => worker) }));

import { mcaFileToGlbInWorker } from './analyze';

const file = { name: 'test-region.mca' } as File;

beforeEach(() => vi.clearAllMocks());

describe('MCA worker lifecycle', () => {
	it('進捗受信中も中断でき、同じファイルで再試行できる', async () => {
		const controller = new AbortController();
		const progress = vi.fn();
		const promise = mcaFileToGlbInWorker(file, {}, controller.signal, progress);
		const update = { stage: 'read', completed: 1, total: 2 };
		worker.onmessage?.({ data: { progress: update } });
		expect(progress).toHaveBeenCalledWith(update);
		expect(worker.terminate).not.toHaveBeenCalled();
		controller.abort();
		await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
		expect(worker.terminate).toHaveBeenCalledOnce();
		const retry = mcaFileToGlbInWorker(file, { maxChunkX: 0 }, new AbortController().signal);
		expect(worker.postMessage).toHaveBeenLastCalledWith({ file, options: { maxChunkX: 0 } });
		worker.onmessage?.({ data: { error: 'test-parse-error' } });
		await expect(retry).rejects.toThrow('test-parse-error');
	});

	it('結果受信後にWorkerとabortリスナーを解放する', async () => {
		const controller = new AbortController();
		const promise = mcaFileToGlbInWorker(file, {}, controller.signal);
		const result = {
			glb: new ArrayBuffer(4),
			chunkCount: 1,
			blockCount: 1,
			faceCount: 6,
			dataVersions: [2865]
		};
		worker.onmessage?.({ data: { result } });
		await expect(promise).resolves.toBe(result);
		controller.abort();
		expect(worker.terminate).toHaveBeenCalledOnce();
	});

	it('開始前キャンセル・送信エラーでもWorkerを残さない', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(mcaFileToGlbInWorker(file, {}, controller.signal)).rejects.toMatchObject({
			name: 'AbortError'
		});
		expect(worker.postMessage).not.toHaveBeenCalled();
		worker.postMessage.mockImplementationOnce(() => {
			throw new Error('test-clone-error');
		});
		await expect(mcaFileToGlbInWorker(file, {}, new AbortController().signal)).rejects.toThrow(
			'test-clone-error'
		);
		expect(worker.terminate).toHaveBeenCalledOnce();
	});

	it.each(['error', 'messageerror'])('Workerの%sを呼び出し元へ返す', async (type) => {
		const promise = mcaFileToGlbInWorker(file, {}, new AbortController().signal);
		if (type === 'error') worker.onerror?.({ message: 'test-worker-error' });
		else worker.onmessageerror?.();
		await expect(promise).rejects.toThrow(
			type === 'error' ? 'test-worker-error' : '受け取れません'
		);
		expect(worker.terminate).toHaveBeenCalledOnce();
	});
});
