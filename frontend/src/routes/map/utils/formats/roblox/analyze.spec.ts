import { afterEach, describe, expect, it, vi } from 'vitest';
import { robloxFileToGlbInWorker } from './analyze';

const { workers } = vi.hoisted(() => ({
	workers: [] as {
		onmessage?: (event: { data: unknown; }) => void;
		onerror?: (event: { message: string; }) => void;
		onmessageerror?: () => void;
		terminate: ReturnType<typeof vi.fn>;
		postMessage: ReturnType<typeof vi.fn>;
	}[]
}));
vi.mock('$app/paths', () => ({ base: '/test-base' }));
vi.mock('$env/static/public', () => ({ PUBLIC_ROBLOX_RESOURCE_URL: '' }));
vi.mock('./worker?worker', () => ({
	default: class {
		onmessage?: (event: { data: unknown; }) => void;
		onerror?: (event: { message: string; }) => void;
		onmessageerror?: () => void;
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
const file = new File(['test'], 'test-world.rbxl');

describe('Roblox変換Worker', () => {
	it('変換結果と未対応内容を返し、Workerを終了する', async () => {
		const promise = robloxFileToGlbInWorker(file, new AbortController().signal);
		expect(workers[0].postMessage).toHaveBeenCalledWith({
			file,
			resourceUrl: '/test-base/roblox'
		});
		const result = { glb: new ArrayBuffer(12), partCount: 1, warnings: ['MeshPart: 1件'] };
		workers[0].onmessage?.({ data: { result } });
		expect(await promise).toBe(result);
		expect(workers[0].terminate).toHaveBeenCalledOnce();
	});
	it('実行中のキャンセルでWorkerを終了する', async () => {
		const controller = new AbortController();
		const promise = robloxFileToGlbInWorker(file, controller.signal);
		controller.abort();
		await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
		expect(workers[0].terminate).toHaveBeenCalledOnce();
	});
	it('キャンセル済みならWorkerを起動しない', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(robloxFileToGlbInWorker(file, controller.signal)).rejects.toMatchObject({
			name: 'AbortError'
		});
		expect(workers).toHaveLength(0);
	});
	it.each(['parse', 'worker', 'transfer'])('%s エラーでもWorkerを解放する', async kind => {
		const promise = robloxFileToGlbInWorker(file, new AbortController().signal);
		if (kind === 'parse') workers[0].onmessage?.({ data: { error: 'test-error' } });
		else if (kind === 'worker') workers[0].onerror?.({ message: 'test-error' });
		else workers[0].onmessageerror?.();
		await expect(promise).rejects.toThrow();
		expect(workers[0].terminate).toHaveBeenCalledOnce();
	});
});
