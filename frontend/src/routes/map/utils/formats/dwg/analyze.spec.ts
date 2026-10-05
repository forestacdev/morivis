import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DwgDrawingResult } from '.';
import { analyzeDwgFileInWorker } from './analyze';
import type { DwgSolidResponse } from './solid.worker';
import type { DwgWorkerResponse } from './worker';

const state = vi.hoisted(() => ({
	workers: [] as {
		onmessage: (event: { data: DwgWorkerResponse | DwgSolidResponse; }) => void;
		onmessageerror: () => void;
		terminate: ReturnType<typeof vi.fn>;
		postMessage: ReturnType<typeof vi.fn>;
		onerror: (event: Partial<ErrorEvent>) => void;
	}[]
}));
const mockWorker = vi.hoisted(() =>
	class {
		terminate = vi.fn();
		postMessage = vi.fn();
		onerror = (_event: Partial<ErrorEvent>) => {};
		onmessage = (_event: { data: DwgWorkerResponse | DwgSolidResponse; }) => {};
		onmessageerror = () => {};
		constructor() {
			state.workers.push(this);
		}
	}
);
vi.mock('./solid.worker?worker', () => ({ default: mockWorker }));
vi.mock('./worker?worker', () => ({
	default: mockWorker
}));
const file = () => new File([new Uint8Array([0, 1, 2])], 'test.dwg');
afterEach(() => {
	state.workers.length = 0;
	vi.useRealTimers();
});

describe('DWG Workerの終了', () => {
	it.each([undefined, '', 'Failed to load module'])(
		'Worker起動エラーの詳細 %s を通知して終了する',
		async message => {
			const result = analyzeDwgFileInWorker(file());
			const rejected = expect(result).rejects.toThrow(message || 'Workerの異常終了');
			await vi.waitFor(() => expect(state.workers).toHaveLength(1));
			state.workers[0].onerror({ message });
			await rejected;
			expect(state.workers[0].terminate).toHaveBeenCalledOnce();
		}
	);
	it('キャンセル時は変換Workerを終了する', async () => {
		const controller = new AbortController();
		const result = analyzeDwgFileInWorker(file(), 'm', controller.signal);
		const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
		await vi.waitFor(() => expect(state.workers).toHaveLength(1));
		controller.abort();
		await rejected;
		expect(state.workers[0].terminate).toHaveBeenCalledOnce();
	});
	it('長時間の変換を自動停止せず、キャンセルで終了できる', async () => {
		vi.useFakeTimers();
		const controller = new AbortController();
		const result = analyzeDwgFileInWorker(file(), 'auto', controller.signal);
		const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
		await vi.waitFor(() => expect(state.workers).toHaveLength(1));
		await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
		expect(state.workers[0].terminate).not.toHaveBeenCalled();
		controller.abort();
		await rejected;
		expect(state.workers[0].terminate).toHaveBeenCalledOnce();
	});
	it('キャンセル済みならWorkerを起動しない', async () => {
		await expect(analyzeDwgFileInWorker(file(), 'auto', AbortSignal.abort())).rejects
			.toMatchObject({ name: 'AbortError' });
		expect(state.workers).toHaveLength(0);
	});
});

const preparedDrawing = {
	geojson: { type: 'FeatureCollection', features: [] },
	metersPerUnit: 0.001,
	sourceUnitCode: 4,
	solids: [],
	solidDescriptors: [],
	skippedSolids: []
} as unknown as DwgDrawingResult;
const startPool = async (count: number, signal?: AbortSignal) => {
	const promise = analyzeDwgFileInWorker(file(), 'auto', signal, {
		mode: 'convert',
		layers: ['test-layer']
	});
	await vi.waitFor(() => expect(state.workers).toHaveLength(1));
	state.workers[0].onmessage({ data: { prepared: preparedDrawing, jobCount: count } });
	return { promise, reader: state.workers[0] };
};
const deliverJob = (index: number, slot: number) => {
	const job = new Uint8Array([index]);
	state.workers[0].onmessage({ data: { job, index, slot } });
	expect(state.workers[slot + 1].postMessage).toHaveBeenLastCalledWith(
		{ job, metersPerUnit: 0.001 },
		[job.buffer]
	);
};
const finishJob = (slot: number, index: number) => {
	state.workers[slot + 1].onmessage({
		data: {
			result: {
				solids: [],
				skippedSolids: [{
					handle: String(index),
					layer: 'test-layer',
					entityType: '3DSOLID',
					blockPath: [],
					reason: 'test-unsupported'
				}]
			}
		}
	});
};

describe('DWGの並列三角形化', () => {
	it('最大4並列で空いたWorkerへ次の部品を渡し、完了順に関係なく入力順へ戻す', async () => {
		const { promise, reader } = await startPool(6);
		expect(state.workers).toHaveLength(5); // 読み取り1 + 三角形化4
		for (let slot = 0; slot < 4; slot++) deliverJob(slot, slot);
		finishJob(2, 2);
		expect(reader.postMessage).toHaveBeenLastCalledWith({ index: 4, slot: 2 });
		deliverJob(4, 2);
		finishJob(0, 0);
		expect(reader.postMessage).toHaveBeenLastCalledWith({ index: 5, slot: 0 });
		deliverJob(5, 0);
		expect(reader.terminate).toHaveBeenCalledOnce();
		finishJob(0, 5);
		finishJob(3, 3);
		finishJob(2, 4);
		finishJob(1, 1);
		expect((await promise).skippedSolids.map(part => part.handle)).toEqual([
			'0',
			'1',
			'2',
			'3',
			'4',
			'5'
		]);
		expect(state.workers).toHaveLength(5);
		for (const worker of state.workers) expect(worker.terminate).toHaveBeenCalledOnce();
	});
	it.each([0, 1, 2])('部品数%sでは必要な数だけWorkerを起動する', async count => {
		const { promise } = await startPool(count);
		expect(state.workers).toHaveLength(count + 1);
		for (let i = 0; i < count; i++) {
			deliverJob(i, i);
			finishJob(i, i);
		}
		await promise;
		for (const worker of state.workers) expect(worker.terminate).toHaveBeenCalledOnce();
	});
	it('並列変換中のキャンセルは全Workerを止め、遅れて届く結果を無視する', async () => {
		const controller = new AbortController();
		const { promise, reader } = await startPool(8, controller.signal);
		const rejected = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
		for (let i = 0; i < 4; i++) deliverJob(i, i);
		controller.abort();
		await rejected;
		const requests = reader.postMessage.mock.calls.length;
		finishJob(0, 0);
		expect(reader.postMessage).toHaveBeenCalledTimes(requests);
		for (const worker of state.workers) expect(worker.terminate).toHaveBeenCalledOnce();
	});
	it.each(['error', 'messageerror', 'postMessage', 'result'])(
		'%sによる失敗時も全Workerを終了する',
		async kind => {
			const { promise } = await startPool(8);
			const rejected = expect(promise).rejects.toThrow();
			const worker = state.workers[1];
			if (kind === 'postMessage') {
				worker.postMessage.mockImplementationOnce(() => {
					throw new Error('test-transfer');
				});
			}
			deliverJob(0, 0);
			if (kind === 'error') worker.onerror({ message: 'test-worker' });
			if (kind === 'messageerror') worker.onmessageerror();
			if (kind === 'result') worker.onmessage({ data: { error: 'test-engine' } });
			await rejected;
			for (const active of state.workers) expect(active.terminate).toHaveBeenCalledOnce();
		}
	);
});
