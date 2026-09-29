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

import { parseHgt } from '.';
import { createTestHgt } from './__fixtures__/test-hgt';
import { runHgtWorker } from './analyze';
beforeEach(() => {
	workers.instances.length = 0;
});

describe('HGT解析Workerの終了', () => {
	it('中断済みの要求ではWorkerを作らない', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(runHgtWorker(new File([], 'N00E000.test-grid.hgt'), controller.signal))
			.rejects.toMatchObject({ name: 'AbortError' });
		expect(workers.instances).toHaveLength(0);
	});
	it('実行中のキャンセルでWorkerを終了し、AbortErrorを返す', async () => {
		const controller = new AbortController();
		const task = runHgtWorker(new File([], 'N00E000.test-grid.hgt'), controller.signal);
		controller.abort();
		await expect(task).rejects.toMatchObject({ name: 'AbortError' });
		expect(workers.instances[0].terminate).toHaveBeenCalledOnce();
	});
	it('成功後はWorkerと中断リスナーを解放する', async () => {
		const controller = new AbortController();
		const task = runHgtWorker(new File([], 'N00E000.test-grid.hgt'), controller.signal);
		const result = parseHgt(createTestHgt(), 'N00E000.test-grid.hgt');
		workers.instances[0].onmessage!({ data: { result } });
		await expect(task).resolves.toBe(result);
		controller.abort();
		expect(workers.instances[0].terminate).toHaveBeenCalledOnce();
	});
	it('変換失敗をフォームへ返してWorkerを解放する', async () => {
		const task = runHgtWorker(
			new File([], 'N00E000.test-grid.hgt'),
			new AbortController().signal
		);
		workers.instances[0].onmessage!({ data: { error: 'test-error' } });
		await expect(task).rejects.toThrow('test-error');
		expect(workers.instances[0].terminate).toHaveBeenCalledOnce();
	});
});
