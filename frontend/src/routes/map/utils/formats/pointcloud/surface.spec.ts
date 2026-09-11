import { beforeEach, describe, expect, it, vi } from 'vitest';

const worker = vi.hoisted(() => ({
	postMessage: vi.fn(),
	terminate: vi.fn(),
	onmessage: null as ((event: { data: unknown; }) => void) | null,
	onerror: null as ((event: { message: string; }) => void) | null,
	onmessageerror: null as (() => void) | null
}));

vi.mock('./surface.worker?worker', () => ({ default: vi.fn(() => worker) }));
vi.mock('$routes/map/data/entries/model', () => ({ createGlbEntry: vi.fn() }));

import { createPointCloudSurfaceEntry } from './surface';

const input = () => ({
	positions: new Float32Array([0, 0, 1, 1, 0, 2, 0, 1, 3]),
	bounds: [0, 0, 1, 1] as [number, number, number, number],
	resolution: 32,
	radius: 2
});

beforeEach(() => vi.clearAllMocks());

describe('surface worker lifecycle', () => {
	it('keeps the worker alive through progress updates and still allows cancellation', async () => {
		const controller = new AbortController();
		const progress = vi.fn();
		const result = createPointCloudSurfaceEntry(
			'test-surface',
			input(),
			controller.signal,
			progress
		);
		worker.onmessage?.({ data: { progress: '面を生成しています' } });
		expect(progress).toHaveBeenCalledWith('面を生成しています');
		expect(worker.terminate).not.toHaveBeenCalled();
		controller.abort();
		await expect(result).rejects.toMatchObject({ name: 'AbortError' });
		expect(worker.terminate).toHaveBeenCalledOnce();
	});
	it('cancels an active conversion without detaching the source, allowing a retry', async () => {
		const params = input();
		const controller = new AbortController();
		const result = createPointCloudSurfaceEntry('test-surface', params, controller.signal);
		controller.abort();
		await expect(result).rejects.toMatchObject({ name: 'AbortError' });
		expect(worker.terminate).toHaveBeenCalledOnce();
		expect([...params.positions]).toEqual([0, 0, 1, 1, 0, 2, 0, 1, 3]);
		const retry = createPointCloudSurfaceEntry('test-surface', params);
		worker.onmessage?.({ data: { error: 'test-conversion-error' } });
		await expect(retry).rejects.toThrow('test-conversion-error');
	});

	it('does not start a cancelled request and terminates when postMessage fails', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(createPointCloudSurfaceEntry('test-surface', input(), controller.signal))
			.rejects.toMatchObject({ name: 'AbortError' });
		expect(worker.postMessage).not.toHaveBeenCalled();
		worker.postMessage.mockImplementationOnce(() => {
			throw new Error('test-clone-error');
		});
		await expect(createPointCloudSurfaceEntry('test-surface', input())).rejects.toThrow(
			'test-clone-error'
		);
		expect(worker.terminate).toHaveBeenCalledOnce();
	});
});
