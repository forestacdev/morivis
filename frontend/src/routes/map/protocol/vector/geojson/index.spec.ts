import { JoinDataCache } from '$routes/map/utils/cache/join-data-cache';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { geojsonProtocol, terminateGeojsonWorker } from './index';
import type { GeojsonTileRequest } from './tile';

const workers: TestWorker[] = [];
class TestWorker extends EventTarget {
	postMessage = vi.fn<(request: GeojsonTileRequest) => void>();
	terminate = vi.fn();
	constructor() {
		super();
		workers.push(this);
	}
	respond = (id: number, buffer: Uint8Array) =>
		this.dispatchEvent(new MessageEvent('message', { data: { id, buffer } }));
}

const protocol = geojsonProtocol('geojson');
const request = (entryId: string) => ({
	url: `geojson://https://test.invalid/${entryId}/11/1029/1018.geojson?z=11&x=1029&y=1018&entryId=${entryId}`
});
const fixture = {
	type: 'FeatureCollection',
	features: [{
		type: 'Feature',
		properties: { code: 'test-code', name: 'test-point' },
		geometry: { type: 'Point', coordinates: [1, 1] }
	}]
};

beforeEach(() => {
	workers.length = 0;
	vi.stubGlobal('Worker', TestWorker);
	vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(fixture))));
});
afterEach(() => {
	terminateGeojsonWorker();
	JoinDataCache.clear();
	vi.unstubAllGlobals();
});

describe('共通GeoJSONプロトコル', () => {
	it('図郭と通常レイヤーの同じz/x/yを並行処理し、JoinDataを分離する', async () => {
		JoinDataCache.set('test-a', { 'test-code': { value: 7 } });
		const first = protocol.request(request('test-a'), new AbortController());
		const second = protocol.request(request('test-b'), new AbortController());
		const sheet = protocol.request({
			url: 'geojson://https://maps.gsi.go.jp/xyz/zk25000/11/1029/1018.geojson?z=11&x=1029&y=1018&transform=topographic-sheets'
		}, new AbortController());
		const worker = workers[0];
		await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledTimes(3));
		const messages = worker.postMessage.mock.calls.map(([message]) => message);
		expect(new Set(messages.map(message => message.id)).size).toBe(3);
		expect(messages[0].geojson.features[0].properties?.value).toBe(7);
		expect(messages[1].geojson.features[0].properties?.value).toBeUndefined();
		expect(messages[2].transform).toBe('topographic-sheets');
		worker.respond(messages[2].id, new Uint8Array([3]));
		worker.respond(messages[1].id, new Uint8Array([2]));
		worker.respond(messages[0].id, new Uint8Array([1]));
		await expect(first).resolves.toEqual({ data: new Uint8Array([1]) });
		await expect(second).resolves.toEqual({ data: new Uint8Array([2]) });
		await expect(sheet).resolves.toEqual({ data: new Uint8Array([3]) });
		expect(workers).toHaveLength(1);
	});
	it('中止した要求の遅延応答で別レイヤーの応答を壊さない', async () => {
		const controller = new AbortController();
		const first = protocol.request(request('test-a'), controller);
		const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' });
		await vi.waitFor(() => expect(workers[0].postMessage).toHaveBeenCalledTimes(1));
		const id = workers[0].postMessage.mock.calls[0][0].id;
		controller.abort();
		await rejected;
		const second = protocol.request(request('test-b'), new AbortController());
		await vi.waitFor(() => expect(workers[0].postMessage).toHaveBeenCalledTimes(2));
		workers[0].respond(id, new Uint8Array([1]));
		workers[0].respond(workers[0].postMessage.mock.calls[1][0].id, new Uint8Array([2]));
		await expect(second).resolves.toEqual({ data: new Uint8Array([2]) });
	});
	it('非表示で処理中の要求と通信を終了し、再表示で作り直す', async () => {
		const first = protocol.request(request('test-a'), new AbortController());
		const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' });
		const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
		terminateGeojsonWorker();
		await rejected;
		expect(signal?.aborted).toBe(true);
		expect(workers[0].terminate).toHaveBeenCalledOnce();
		const next = protocol.request(request('test-b'), new AbortController());
		await vi.waitFor(() => expect(workers[1].postMessage).toHaveBeenCalledTimes(1));
		workers[1].respond(workers[1].postMessage.mock.calls[0][0].id, new Uint8Array());
		await expect(next).resolves.toEqual({ data: new Uint8Array() });
	});
	it('事前に中止された要求はWorkerを生成しない', () => {
		const controller = new AbortController();
		controller.abort();
		expect(() => protocol.request(request('test-a'), controller)).toThrow();
		expect(workers).toHaveLength(0);
	});
});
