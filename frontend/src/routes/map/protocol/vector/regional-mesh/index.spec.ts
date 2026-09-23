import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { regionalMeshProtocol, terminateRegionalMeshWorker } from './index';

const workers: TestWorker[] = [];
class TestWorker {
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: ((event: ErrorEvent) => void) | null = null;
	onmessageerror: (() => void) | null = null;
	postMessage = vi.fn();
	terminate = vi.fn();
	constructor() {
		workers.push(this);
	}
	respond = (id: number, data: Uint8Array) =>
		this.onmessage?.({ data: { id, data } } as MessageEvent);
}
const tile = { url: 'regional_mesh://tile/1/0/0/0.pbf' };

beforeEach(() => {
	workers.length = 0;
	vi.stubGlobal('Worker', TestWorker);
});
afterEach(() => {
	terminateRegionalMeshWorker();
	vi.unstubAllGlobals();
});

describe('地域メッシュWorkerのライフサイクル', () => {
	it('同じタイルの同時要求でも応答先が混ざらない', async () => {
		const first = regionalMeshProtocol.request(tile, new AbortController());
		const second = regionalMeshProtocol.request(tile, new AbortController());
		expect(workers).toHaveLength(1);
		const worker = workers[0];
		const [a, b] = worker.postMessage.mock.calls.map(([message]) => message.id);
		expect(a).not.toBe(b);
		worker.respond(b, new Uint8Array([2]));
		worker.respond(a, new Uint8Array([1]));
		await expect(first).resolves.toEqual({ data: new Uint8Array([1]) });
		await expect(second).resolves.toEqual({ data: new Uint8Array([2]) });
	});

	it('中止した要求の遅延応答は別の要求に届かない', async () => {
		const controller = new AbortController();
		const first = regionalMeshProtocol.request(tile, controller);
		const rejection = expect(first).rejects.toMatchObject({ name: 'AbortError' });
		const worker = workers[0];
		const firstId = worker.postMessage.mock.calls[0][0].id;
		controller.abort();
		await rejection;
		const second = regionalMeshProtocol.request(tile, new AbortController());
		worker.respond(firstId, new Uint8Array([1]));
		worker.respond(worker.postMessage.mock.calls[1][0].id, new Uint8Array([2]));
		await expect(second).resolves.toEqual({ data: new Uint8Array([2]) });
	});

	it('非表示時は未完了の要求を終了し、再表示時は新しいWorkerを使う', async () => {
		const request = regionalMeshProtocol.request(tile, new AbortController());
		const rejection = expect(request).rejects.toMatchObject({ name: 'AbortError' });
		terminateRegionalMeshWorker();
		await rejection;
		expect(workers[0].terminate).toHaveBeenCalledOnce();
		const next = regionalMeshProtocol.request(tile, new AbortController());
		expect(workers).toHaveLength(2);
		workers[1].respond(workers[1].postMessage.mock.calls[0][0].id, new Uint8Array());
		await expect(next).resolves.toEqual({ data: new Uint8Array() });
	});

	it('事前に中止された要求ではWorkerを作らない', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(regionalMeshProtocol.request(tile, controller)).rejects.toMatchObject({
			name: 'AbortError'
		});
		expect(workers).toHaveLength(0);
	});

	it('Workerのエラーを空タイルとして隠さず要求元へ返す', async () => {
		const request = regionalMeshProtocol.request(tile, new AbortController());
		const rejection = expect(request).rejects.toMatchObject({ name: 'OperationError' });
		workers[0].onerror?.({ message: 'test-worker-error' } as ErrorEvent);
		await rejection;
		expect(workers[0].terminate).toHaveBeenCalledOnce();
	});
});
