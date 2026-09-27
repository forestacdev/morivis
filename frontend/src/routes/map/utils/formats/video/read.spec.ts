import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readVideoFile } from './read';

const video = {
	muted: false,
	playsInline: false,
	preload: '',
	src: '',
	onloadeddata: null as (() => void) | null,
	onerror: null as (() => void) | null,
	load: vi.fn(),
	pause: vi.fn(),
	removeAttribute: vi.fn()
};
const file = new File(['test'], 'test-video.webm', { type: 'video/webm' });

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal('document', { createElement: () => video });
	vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-video');
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('動画読み込みの後始末', () => {
	it('再生できない動画ではエラーを返してURLとメディアを解放する', async () => {
		const pending = readVideoFile(file, new AbortController().signal);
		video.onerror?.();
		await expect(pending).rejects.toThrow('ブラウザで再生できません');
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-video');
		expect(video.pause).toHaveBeenCalledOnce();
		expect(video.removeAttribute).toHaveBeenCalledWith('src');
		expect(video.onerror).toBeNull();
	});
	it('中断時は待機を終了してURLを解放する', async () => {
		const controller = new AbortController();
		const pending = readVideoFile(file, controller.signal);
		controller.abort();
		await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
		expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
		expect(video.onloadeddata).toBeNull();
	});
	it('フレームが読み込めないまま待ち続けない', async () => {
		vi.useFakeTimers();
		const pending = readVideoFile(file, new AbortController().signal);
		const rejection = expect(pending).rejects.toThrow('時間内');
		await vi.advanceTimersByTimeAsync(30_000);
		await rejection;
		expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
	});
});
