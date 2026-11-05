import type {
	RasterCogEntry,
	RasterTiffStyle,
	RasterWcsEntry
} from '$routes/map/data/types/raster';
import type { Map as MapLibreMap } from '$routes/map/utils/maplibre';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), readViewport: vi.fn() }));
vi.mock('$routes/map/utils/platform/request', () => ({ fetchWithDevProxy: mocks.fetch }));
vi.mock(
	'$routes/map/utils/formats/wcs',
	() => ({ buildWcsGetCoverageUrl: () => 'https://test.invalid/coverage' })
);
vi.mock('$routes/map/utils/formats/geotiff/reader', () => ({ fromArrayBuffer: vi.fn() }));
vi.mock('$routes/map/utils/formats/geotiff/cog_tile_manager', () => ({
	CogTileManager: { readViewport: mocks.readViewport, getMetadata: () => ({}) }
}));
vi.mock('$routes/map/utils/style/color-mapping', () => ({
	ColorMapManager: class {
		createColorArray = () => new Uint8Array(4);
	}
}));

import {
	clearAllCogViewportImages,
	fetchCogViewportImage,
	markCogViewportReady,
	terminateCogViewportRuntime
} from '../formats/geotiff/cog-runtime';
import {
	clearAllWcsViewportImages,
	fetchWcsViewportImage,
	markWcsViewportReady
} from '../formats/wcs/runtime';

class TestWorker extends EventTarget {
	static instances: TestWorker[] = [];
	constructor() {
		super();
		TestWorker.instances.push(this);
	}
	postMessage = vi.fn();
	terminate = vi.fn();
}
const map = {
	getCanvas: () => ({ width: 1, height: 1 }),
	getBounds: () => ({ getWest: () => 0, getSouth: () => 0, getEast: () => 1, getNorth: () => 1 })
} as unknown as MapLibreMap;
const wcsEntry = {
	id: 'test-wcs',
	format: { outputFormat: 'image/png' }
} as RasterWcsEntry<unknown>;
const cogEntry = {
	id: 'test-cog',
	style: {
		visualization: { mode: 'single', uniformsData: { single: { index: 0, min: 0, max: 1 } } }
	}
} as RasterCogEntry<RasterTiffStyle>;
const tileData = { bands: [new Float32Array([1])], srcWidth: 1, srcHeight: 1 };

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal('Worker', TestWorker);
	TestWorker.instances = [];
	vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-image');
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => {
	clearAllCogViewportImages();
	terminateCogViewportRuntime();
	clearAllWcsViewportImages();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('地図破棄後のviewport画像', () => {
	it('WCSの古い通信結果が、再訪問後の同じIDの画像を上書きしない', async () => {
		let finish!: (response: Response) => void;
		mocks.fetch.mockReturnValueOnce(
			new Promise(resolve => {
				finish = resolve;
			})
		);
		markWcsViewportReady(wcsEntry.id);
		const oldImage = fetchWcsViewportImage(wcsEntry, map);
		clearAllWcsViewportImages();
		markWcsViewportReady(wcsEntry.id);
		mocks.fetch.mockResolvedValueOnce(
			new Response(new Blob(['test-new'], { type: 'image/png' }))
		);
		expect(await fetchWcsViewportImage(wcsEntry, map)).toMatchObject({
			url: 'blob:test-image'
		});
		finish(new Response(new Blob(['test-old'], { type: 'image/png' })));
		expect(await oldImage).toBeNull();
		expect(URL.createObjectURL).toHaveBeenCalledOnce();
		expect(URL.revokeObjectURL).not.toHaveBeenCalled();
	});

	it('COGの読み取り待ちで破棄したWorkerへ、後から計算を送らない', async () => {
		let finish!: (value: typeof tileData) => void;
		mocks.readViewport.mockReturnValueOnce(
			new Promise(resolve => {
				finish = resolve;
			})
		);
		markCogViewportReady(cogEntry.id);
		const image = fetchCogViewportImage(cogEntry, map);
		const worker = TestWorker.instances[0];
		clearAllCogViewportImages();
		terminateCogViewportRuntime();
		finish(tileData);
		expect(await image).toBeNull();
		expect(worker.terminate).toHaveBeenCalledOnce();
		expect(worker.postMessage).not.toHaveBeenCalled();
		expect(URL.createObjectURL).not.toHaveBeenCalled();
	});

	it('COGの計算完了直後に破棄しても画像URLを作らず、再訪問では再描画できる', async () => {
		mocks.readViewport.mockResolvedValue(tileData);
		markCogViewportReady(cogEntry.id);
		const image = fetchCogViewportImage(cogEntry, map);
		const worker = TestWorker.instances[0];
		await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledOnce());
		const [{ tileId }] = worker.postMessage.mock.calls[0];
		worker.dispatchEvent(
			new MessageEvent('message', { data: { id: tileId, buffer: new Uint8Array([0]) } })
		);
		clearAllCogViewportImages();
		terminateCogViewportRuntime();
		markCogViewportReady(cogEntry.id);
		expect(await image).toBeNull();
		expect(URL.createObjectURL).not.toHaveBeenCalled();
		const nextImage = fetchCogViewportImage(cogEntry, map);
		const nextWorker = TestWorker.instances[1];
		await vi.waitFor(() => expect(nextWorker.postMessage).toHaveBeenCalledOnce());
		const [nextMessage] = nextWorker.postMessage.mock.calls[0];
		nextWorker.dispatchEvent(
			new MessageEvent('message', {
				data: { id: nextMessage.tileId, buffer: new Uint8Array([0]) }
			})
		);
		expect(await nextImage).toMatchObject({ url: 'blob:test-image' });
		expect(URL.createObjectURL).toHaveBeenCalledOnce();
	});
});
