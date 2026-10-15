import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convertGifToVideo } from '.';
import { formatGif } from './definition';

const worker = {
	onmessage: null as ((event: { data: { result?: ArrayBuffer; error?: string; }; }) => void) | null,
	onerror: null as (() => void) | null,
	onmessageerror: null as (() => void) | null,
	postMessage: vi.fn(),
	terminate: vi.fn()
};
const input = new File(['test'], 'test-animation.GIF', { type: 'image/gif' });

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal('Worker', vi.fn(() => worker));
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe('GIF変換Workerのライフサイクル', () => {
	it('変換結果をMP4のFileとして返してWorkerを終了する', async () => {
		const pending = convertGifToVideo(input, new AbortController().signal);
		worker.onmessage?.({ data: { result: new ArrayBuffer(3) } });
		const result = await pending;
		expect([result.name, result.type, result.size]).toEqual(['test-animation.mp4', 'video/mp4', 3]);
		expect(worker.terminate).toHaveBeenCalledOnce();
	});
	it('変換中のキャンセルでWorkerを即座に終了する', async () => {
		const controller = new AbortController();
		const pending = convertGifToVideo(input, controller.signal);
		controller.abort();
		await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
		expect(worker.terminate).toHaveBeenCalledOnce();
	});
	it('変換失敗を呼び出し元へ返す', async () => {
		const pending = convertGifToVideo(input, new AbortController().signal);
		worker.onmessage?.({ data: { error: 'test-error' } });
		await expect(pending).rejects.toThrow('test-error');
		expect(worker.terminate).toHaveBeenCalledOnce();
	});
	it('起動・変換が完了しない場合もタイムアウトでWorkerを終了する', async () => {
		vi.useFakeTimers();
		const pending = convertGifToVideo(input, new AbortController().signal);
		const rejected = expect(pending).rejects.toThrow('時間内');
		await vi.advanceTimersByTimeAsync(formatGif.limits.timeoutMs);
		await rejected;
		expect(worker.terminate).toHaveBeenCalledOnce();
	});
	it('開始前のキャンセルはWorkerを作らない', () => {
		const controller = new AbortController();
		controller.abort();
		expect(() => convertGifToVideo(input, controller.signal)).toThrow();
		expect(Worker).not.toHaveBeenCalled();
	});
});
