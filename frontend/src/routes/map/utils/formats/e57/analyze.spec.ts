import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
	workers: [] as Array<{
		postMessage: ReturnType<typeof vi.fn>;
		terminate: ReturnType<typeof vi.fn>;
		onmessage?: (event: { data: unknown; }) => void;
		onerror?: (event: { message: string; }) => void;
	}>
}));
vi.mock('./worker?worker', () => ({
	default: vi.fn(() => {
		const worker = { postMessage: vi.fn(), terminate: vi.fn() };
		state.workers.push(worker);
		return worker;
	})
}));
import { parseE57File } from './analyze';
const file = new File([new Uint8Array(48)], 'test-cloud.e57');
beforeEach(() => {
	state.workers = [];
});

describe('E57 worker lifecycle', () => {
	it.each([undefined, 'y-up', 'z-up'] as const)(
		'選択した上方向 %s をWorkerへ渡す',
		async upAxis => {
			const pending = parseE57File(file, new AbortController().signal, upAxis);
			expect(state.workers[0].postMessage).toHaveBeenCalledWith({
				file,
				upAxis: upAxis ?? 'z-up'
			});
			state.workers[0].onmessage?.({ data: { result: { pointCount: 2 } } });
			await expect(pending).resolves.toMatchObject({ pointCount: 2 });
		}
	);
	it('中断時にWorkerを終了し、次の読み込みは独立して実行する', async () => {
		const controller = new AbortController();
		const first = parseE57File(file, controller.signal);
		controller.abort();
		await expect(first).rejects.toMatchObject({ name: 'AbortError' });
		expect(state.workers[0].terminate).toHaveBeenCalledOnce();
		const second = parseE57File(file, new AbortController().signal);
		state.workers[1].onmessage?.({ data: { error: 'test-decode-error' } });
		await expect(second).rejects.toThrow('test-decode-error');
		expect(state.workers[1].terminate).toHaveBeenCalledOnce();
	});
	it('結果受信後に終了し、後からのabortでは二重終了しない', async () => {
		const controller = new AbortController();
		const pending = parseE57File(file, controller.signal);
		state.workers[0].onmessage?.({ data: { result: { pointCount: 2 } } });
		await expect(pending).resolves.toMatchObject({ pointCount: 2 });
		controller.abort();
		expect(state.workers[0].terminate).toHaveBeenCalledOnce();
	});
});
