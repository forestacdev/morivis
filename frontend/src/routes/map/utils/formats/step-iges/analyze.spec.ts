import { beforeEach, describe, expect, it, vi } from 'vitest';

const workers = vi.hoisted(() => ({
	instances: [] as {
		onmessage: ((event: { data: unknown; }) => void) | null;
		onerror: ((event: { message: string; }) => void) | null;
		onmessageerror: (() => void) | null;
		postMessage: ReturnType<typeof vi.fn>;
		terminate: ReturnType<typeof vi.fn>;
	}[]
}));

vi.mock('./worker?worker', () => ({
	default: class {
		onmessage = null;
		onerror = null;
		onmessageerror = null;
		postMessage = vi.fn();
		terminate = vi.fn();
		constructor() {
			workers.instances.push(this);
		}
	}
}));

import { cadFileToGlbInWorker } from './analyze';
beforeEach(() => {
	workers.instances.length = 0;
});

describe('CAD変換Workerの終了', () => {
	it('中断済みの要求ではWorkerを作らない', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(cadFileToGlbInWorker(new File([], 'test.step'), 'z', controller.signal))
			.rejects.toMatchObject({ name: 'AbortError' });
		expect(workers.instances).toHaveLength(0);
	});
	it('実行中のキャンセルでWorkerを終了し、AbortErrorを返す', async () => {
		const controller = new AbortController();
		const task = cadFileToGlbInWorker(new File([], 'test.step'), 'z', controller.signal);
		controller.abort();
		await expect(task).rejects.toMatchObject({ name: 'AbortError' });
		expect(workers.instances[0].terminate).toHaveBeenCalledOnce();
	});
	it('成功後はWorkerと中断リスナーを解放する', async () => {
		const controller = new AbortController();
		const task = cadFileToGlbInWorker(new File([], 'test.igs'), 'y', controller.signal);
		const glb = new ArrayBuffer(12);
		workers.instances[0].onmessage!({ data: { glb } });
		await expect(task).resolves.toBe(glb);
		controller.abort();
		expect(workers.instances[0].terminate).toHaveBeenCalledOnce();
	});
	it('変換失敗をフォームへ返してWorkerを解放する', async () => {
		const task = cadFileToGlbInWorker(
			new File([], 'test.step'),
			'z',
			new AbortController().signal
		);
		workers.instances[0].onmessage!({ data: { error: 'test-error' } });
		await expect(task).rejects.toThrow('test-error');
		expect(workers.instances[0].terminate).toHaveBeenCalledOnce();
	});
});
