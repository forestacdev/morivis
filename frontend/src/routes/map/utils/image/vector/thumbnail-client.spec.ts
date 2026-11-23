import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { thumbnailStyle } from './__fixtures__/thumbnail';
import type { ThumbnailRequest, ThumbnailResourceRequest } from './thumbnail';

const { workers, loadResource } = vi.hoisted(() => ({
	workers: [] as MockWorker[],
	loadResource: vi.fn()
}));

class MockWorker {
	onmessage:
		| ((event: { data: { blob?: Blob; error?: string; } | ThumbnailResourceRequest; }) => void)
		| null = null;
	onerror: ((event: { message: string; }) => void) | null = null;
	onmessageerror: (() => void) | null = null;
	postMessage = vi.fn((request: ThumbnailRequest) => structuredClone(request));
	terminate = vi.fn();
}

vi.mock('./thumbnail-resource', () => ({ createThumbnailResourceLoader: () => loadResource }));

vi.mock('./thumbnail.worker?worker', () => ({
	default: class extends MockWorker {
		constructor() {
			super();
			workers.push(this);
		}
	}
}));

beforeEach(() => {
	vi.resetModules();
	vi.useFakeTimers();
	workers.length = 0;
	loadResource.mockReset();
	vi.stubGlobal('document', { baseURI: 'https://test.invalid/morivis/map' });
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('サムネイル生成のWorker', () => {
	it('Proxy由来のスタイルを送り、複数の画像を同じWorkerで順に生成する', async () => {
		const { generateVectorThumbnail } = await import('./thumbnail-client');
		const first = generateVectorThumbnail(new Proxy(thumbnailStyle, {}), [-3, -3, 3, 3]);
		const second = generateVectorThumbnail(thumbnailStyle, [-2, -2, 2, 2]);
		await vi.waitFor(() => expect(workers[0]?.postMessage).toHaveBeenCalledTimes(1));
		workers[0].onmessage?.({
			data: { blob: new Blob(['test-first'], { type: 'image/webp' }) }
		});
		const firstUrl = await first;
		await vi.waitFor(() => expect(workers[0].postMessage).toHaveBeenCalledTimes(2));
		workers[0].onmessage?.({
			data: { blob: new Blob(['test-second'], { type: 'image/webp' }) }
		});
		const secondUrl = await second;
		expect(workers).toHaveLength(1);
		expect(firstUrl).toMatch(/^blob:/);
		expect(secondUrl).not.toBe(firstUrl);
		URL.revokeObjectURL(firstUrl);
		URL.revokeObjectURL(secondUrl);
	});

	it('タイムアウトしたWorkerを終了し、次の画像を新しいWorkerで処理する', async () => {
		const { generateVectorThumbnail } = await import('./thumbnail-client');
		const first = generateVectorThumbnail(thumbnailStyle, [-3, -3, 3, 3]);
		const rejected = expect(first).rejects.toThrow('タイムアウト');
		const second = generateVectorThumbnail(thumbnailStyle, [-2, -2, 2, 2]);
		await vi.advanceTimersByTimeAsync(30_000);
		await rejected;
		expect(workers[0].terminate).toHaveBeenCalledOnce();
		expect(workers).toHaveLength(2);
		workers[1].onmessage?.({ data: { blob: new Blob(['test-recovered']) } });
		URL.revokeObjectURL(await second);
	});
	it('リソース要求に応答し、タイムアウト時は取得を中断して遅い応答を捨てる', async () => {
		const { generateVectorThumbnail } = await import('./thumbnail-client');
		const first = generateVectorThumbnail(thumbnailStyle, [-3, -3, 3, 3]);
		const rejected = expect(first).rejects.toThrow('タイムアウト');
		await vi.waitFor(() => expect(workers[0]?.postMessage).toHaveBeenCalledOnce());
		loadResource.mockResolvedValueOnce({ bytes: new Uint8Array([1, 2]) });
		workers[0].onmessage?.({ data: { type: 'resource', id: 1, url: 'mbtiles://test/0/0/0' } });
		await vi.waitFor(() => expect(workers[0].postMessage).toHaveBeenCalledTimes(2));
		expect(workers[0].postMessage.mock.calls[1][0]).toMatchObject({
			type: 'resource',
			id: 1,
			bytes: new Uint8Array([1, 2])
		});
		let finish!: (value: { bytes: null; }) => void;
		loadResource.mockImplementationOnce(() =>
			new Promise(resolve => {
				finish = resolve;
			})
		);
		workers[0].onmessage?.({
			data: { type: 'resource', id: 2, url: 'https://test.invalid/test.pbf' }
		});
		const controller = loadResource.mock.calls[1][1] as AbortController;
		await vi.advanceTimersByTimeAsync(30_000);
		await rejected;
		expect(controller.signal.aborted).toBe(true);
		finish({ bytes: null });
		await Promise.resolve();
		expect(workers[0].postMessage).toHaveBeenCalledTimes(2);
	});
});
