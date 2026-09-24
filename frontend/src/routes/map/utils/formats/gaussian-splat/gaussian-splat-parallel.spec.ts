import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseGaussianSplatInWorker } from './gaussian-splat-parallel';

const { workers } = vi.hoisted(() => ({
	workers: [] as {
		onmessage?: (event: { data: unknown; }) => void;
		onerror?: (event: { message: string; }) => void;
		terminate: ReturnType<typeof vi.fn>;
		postMessage: ReturnType<typeof vi.fn>;
	}[]
}));
vi.mock('./gaussian-splat.worker?worker', () => ({
	default: class {
		onmessage?: (event: { data: unknown; }) => void;
		onerror?: (event: { message: string; }) => void;
		terminate = vi.fn();
		postMessage = vi.fn();
		constructor() {
			workers.push(this);
		}
	}
}));
afterEach(() => {
	workers.length = 0;
});

describe('3DGS Worker', () => {
	it.each(['ply', 'spz'] as const)(
		'%s の形式を明示して転送し、完了時にWorkerを解放する',
		async encoding => {
			const buffer = new ArrayBuffer(16);
			const promise = parseGaussianSplatInWorker(buffer, encoding);
			const worker = workers[0];
			expect(worker.postMessage).toHaveBeenCalledWith({ buffer, encoding }, [buffer]);
			const data = { positions: new Float32Array([1, 2, 3]) };
			worker.onmessage?.({ data: { data } });
			expect(await promise).toBe(data);
			expect(worker.terminate).toHaveBeenCalledOnce();
		}
	);
	it('キャンセル時に処理中のWorkerを停止する', async () => {
		const controller = new AbortController();
		const promise = parseGaussianSplatInWorker(new ArrayBuffer(16), 'spz', controller.signal);
		controller.abort();
		await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
		expect(workers[0].terminate).toHaveBeenCalledOnce();
	});
	it('開始前のキャンセルではWorkerを作らない', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(parseGaussianSplatInWorker(new ArrayBuffer(16), 'spz', controller.signal))
			.rejects.toMatchObject({ name: 'AbortError' });
		expect(workers).toHaveLength(0);
	});
	it('解析エラーを保持してWorkerを解放する', async () => {
		const promise = parseGaussianSplatInWorker(new ArrayBuffer(16), 'spz');
		workers[0].onmessage?.({ data: { error: 'SPZの点データが途中で終わっています。' } });
		await expect(promise).rejects.toThrow('SPZの点データ');
		expect(workers[0].terminate).toHaveBeenCalledOnce();
	});
});
