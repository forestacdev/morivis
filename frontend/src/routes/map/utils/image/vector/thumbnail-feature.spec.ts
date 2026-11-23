import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { thumbnailStyle } from './__fixtures__/thumbnail';

class TileWorker {
	message?: (event: { data: { id: string; buffer: Uint8Array; }; }) => void;
	postMessage = vi.fn<(request: { id: string; }) => void>();
	addEventListener = (type: string, callback: TileWorker['message']) => {
		if (type === 'message') this.message = callback;
	};
	terminate = vi.fn();
}

const workers: TileWorker[] = [];

beforeEach(() => {
	vi.resetModules();
	workers.length = 0;
	vi.stubGlobal(
		'Worker',
		class extends TileWorker {
			constructor() {
				super();
				workers.push(this);
			}
		}
	);
	const source = thumbnailStyle.sources['test-vector'];
	if (source.type !== 'geojson') throw new Error('Invalid fixture');
	vi.stubGlobal('fetch', vi.fn(async () => Response.json(source.data)));
});

afterEach(() => vi.unstubAllGlobals());

describe('Featureサービスをサムネイルへ接続する', () => {
	it.each([
		'esri-feature://https://test.invalid/test?x=0&y=0&z=0',
		'ogc-feature://request?src=https%3A%2F%2Ftest.invalid%2Ftest&sourceLayer=test-layer&x=0&y=0&z=0',
		'wfs-feature://request?serviceUrl=https%3A%2F%2Ftest.invalid%2Ftest&version=2.0.0&typeName=test-layer&sourceLayer=test-layer&x=0&y=0&z=0'
	])('同じタイルの並行要求を取り違えず、キャッシュをtransferで破壊しない: %s', async url => {
		const { createThumbnailResourceLoader } = await import('./thumbnail-resource');
		const load = createThumbnailResourceLoader(thumbnailStyle, 'https://test.invalid/');
		const first = load(url, new AbortController());
		const second = load(url, new AbortController());
		await vi.waitFor(() => expect(workers[0]?.postMessage).toHaveBeenCalledTimes(2));
		const [a, b] = workers[0].postMessage.mock.calls.map(([request]) => request.id);
		expect(a).not.toBe(b);
		workers[0].message?.({ data: { id: b, buffer: new Uint8Array([2]) } });
		workers[0].message?.({ data: { id: a, buffer: new Uint8Array([1]) } });
		expect((await second).bytes).toEqual(new Uint8Array([2]));
		const bytes = (await first).bytes!;
		expect(bytes).toEqual(new Uint8Array([1]));
		structuredClone(bytes, { transfer: [bytes.buffer] });
		expect(bytes.byteLength).toBe(0);
		expect((await load(url, new AbortController())).bytes).toEqual(new Uint8Array([1]));
		expect(workers[0].postMessage).toHaveBeenCalledTimes(2);
	});
});
