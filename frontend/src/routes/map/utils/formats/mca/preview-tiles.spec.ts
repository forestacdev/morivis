import type { AddProtocolAction } from '$routes/map/utils/maplibre';
import { afterEach, expect, it, vi } from 'vitest';
import { MCA_PREVIEW_ZOOM } from './preview-map';
import { registerPreviewTiles } from './preview-tiles';
import type { McaTileResponse } from './surface-tile.worker';

const { addProtocol } = vi.hoisted(() => ({
	addProtocol: vi.fn<(name: string, load: AddProtocolAction) => void>()
}));
vi.mock('$routes/map/utils/maplibre', () => ({ addProtocol, removeProtocol: vi.fn() }));

const setup = () => {
	const workers: TestWorker[] = [];
	class TestWorker {
		constructor() {
			workers.push(this);
		}
		onmessage?: (event: { data: McaTileResponse; }) => void;
		postMessage = vi.fn();
		terminate = vi.fn();
		finish = () => this.onmessage?.({ data: { image: new Blob(['test-image']) } });
	}
	vi.stubGlobal('Worker', TestWorker);
	const files = Array.from({ length: 6 }, (_, x) => new File([], `r.${x}.0.mca`));
	const regions = new Map(files.map((file, x) => [`${x}/0`, { x, y: 0, files: [file] }]));
	const session = registerPreviewTiles(regions, new Map(), vi.fn());
	const load = addProtocol.mock.lastCall![1];
	const request = (x: number, controller = new AbortController()) =>
		load({ url: `${session.protocol}://tile/${MCA_PREVIEW_ZOOM}/${x}/0` }, controller);
	return { workers, files, session, request };
};

afterEach(() => vi.unstubAllGlobals());

it('必要になるまでWorkerを作らず、最大4件を処理して空いたWorkerを再利用する', async () => {
	const { workers, files, request, session } = setup();
	expect(workers).toHaveLength(0);
	const requests = files.map((_, x) => request(x));
	const duplicate = request(0);
	await Promise.resolve();
	expect(workers).toHaveLength(4);
	expect(workers.map(worker => worker.postMessage.mock.lastCall?.[0])).toEqual(files.slice(0, 4));
	for (const index of [4, 5]) {
		workers[2].finish();
		await requests[index === 4 ? 2 : 4];
		expect(workers[2].postMessage).toHaveBeenLastCalledWith(files[index]);
	}
	workers.forEach(worker => worker.finish());
	await Promise.all([...requests, duplicate]);
	await request(0);
	expect(workers.map(worker => worker.postMessage.mock.calls.length)).toEqual([1, 1, 3, 1]);
	session.dispose();
	expect(workers.every(worker => worker.terminate.mock.calls.length === 1)).toBe(true);
});

it('待機中と生成中の要求を個別に取り消し、終了時には残りも停止する', async () => {
	const { workers, files, session, request } = setup();
	const controllers = files.map(() => new AbortController());
	const results = Promise.allSettled(controllers.map((controller, x) => request(x, controller)));
	await Promise.resolve();
	controllers[4].abort();
	controllers[1].abort();
	await vi.waitFor(() => expect(workers.at(-1)?.postMessage).toHaveBeenCalledWith(files[5]));
	expect(workers[1].terminate).toHaveBeenCalledOnce();
	expect(workers[0].terminate).not.toHaveBeenCalled();
	session.dispose();
	for (const result of await results) {
		expect(result).toMatchObject({ status: 'rejected', reason: { name: 'AbortError' } });
	}
	expect(workers.every(worker => worker.terminate.mock.calls.length === 1)).toBe(true);
});
