import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import { inspectVtkFileInWorker, vtkFileToGlbInWorker } from './analyze';
import { formatVtk } from './definition';

const file = () => new File(['test-vtk'], 'test-surface.vtk');
beforeEach(() => {
	workers.instances.length = 0;
});
afterEach(() => {
	vi.useRealTimers();
});

describe('VTK Workerのライフサイクル', () => {
	it('中断済み・上限超過ではWorkerを作らない', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(inspectVtkFileInWorker(file(), controller.signal)).rejects.toMatchObject({
			name: 'AbortError'
		});
		await expect(
			inspectVtkFileInWorker(
				{ size: formatVtk.limits.maxFileBytes + 1 } as File,
				new AbortController().signal
			)
		).rejects.toThrow('64 MiB');
		expect(workers.instances).toHaveLength(0);
	});
	it('解析中のキャンセルでWorkerを終了する', async () => {
		const controller = new AbortController();
		const task = inspectVtkFileInWorker(file(), controller.signal);
		controller.abort();
		await expect(task).rejects.toMatchObject({ name: 'AbortError' });
		expect(workers.instances[0].terminate).toHaveBeenCalledOnce();
	});
	it('時間制限を超えた処理を終了して理由を返す', async () => {
		vi.useFakeTimers();
		const task = inspectVtkFileInWorker(file(), new AbortController().signal);
		const rejection = expect(task).rejects.toThrow('時間内');
		await vi.advanceTimersByTimeAsync(formatVtk.limits.timeoutMs);
		await rejection;
		expect(workers.instances[0].terminate).toHaveBeenCalledOnce();
	});
	it('変換結果と選択値を受け渡し、成功後のキャンセルを無視する', async () => {
		const controller = new AbortController();
		const input = file();
		const options = { scalarId: '1', upAxis: 'z' as const, unitScale: 0.01 };
		const task = vtkFileToGlbInWorker(input, options, controller.signal);
		expect(workers.instances[0].postMessage).toHaveBeenCalledWith({ file: input, options });
		const glb = new ArrayBuffer(12);
		workers.instances[0].onmessage!({ data: { glb } });
		await expect(task).resolves.toBe(glb);
		controller.abort();
		expect(workers.instances[0].terminate).toHaveBeenCalledOnce();
	});
	it.each(['error', 'messageerror', 'parse'])(
		'%sをフォームへ返し、Workerを解放する',
		async kind => {
			const task = inspectVtkFileInWorker(file(), new AbortController().signal);
			if (kind === 'error') workers.instances[0].onerror!({ message: 'test-error' });
			else if (kind === 'messageerror') workers.instances[0].onmessageerror!();
			else workers.instances[0].onmessage!({ data: { error: 'test-parse-error' } });
			await expect(task).rejects.toThrow();
			expect(workers.instances[0].terminate).toHaveBeenCalledOnce();
		}
	);
});
