import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ list: vi.fn(), volume: vi.fn() }));
vi.mock('./runtime', () => ({
	configureGeoZarrRuntime: vi.fn(),
	geozarrProtocol: () => ({ request: vi.fn() }),
	listGeoZarrArrayCandidates: mocks.list,
	readGeoZarrVolumeRegion: mocks.volume,
	inspectGeoZarr: vi.fn(),
	mountLocalGeoZarr: vi.fn(),
	readGeoZarrVoxelRegion: vi.fn(),
	registerGeoZarr: vi.fn(),
	releaseLocalGeoZarr: vi.fn(),
	unregisterGeoZarr: vi.fn()
}));
afterEach(() => {
	vi.unstubAllGlobals();
	vi.resetModules();
	vi.clearAllMocks();
});

it('候補配列のvaluesメソッドを転送用バッファと混同しない', async () => {
	const host = {
		onmessage: null as null | ((event: unknown) => Promise<void>),
		postMessage: vi.fn()
	};
	vi.stubGlobal('self', host);
	await import('./geozarr.worker');
	const candidates = [{ arrayPath: 'test-values' }];
	mocks.list.mockResolvedValue(candidates);
	await host.onmessage!({
		data: {
			type: 'list',
			id: 1,
			origin: 'https://example.test',
			publicEnv: {},
			payload: { url: 'https://example.test/test.zarr' }
		}
	});
	expect(host.postMessage).toHaveBeenCalledWith({ id: 1, value: candidates }, []);
});

it('ボリュームのFloat32Arrayをコピーせず転送する', async () => {
	const host = {
		onmessage: null as null | ((event: unknown) => Promise<void>),
		postMessage: vi.fn()
	};
	vi.stubGlobal('self', host);
	await import('./geozarr.worker');
	const data = { values: new Float32Array([0, 1]) };
	mocks.volume.mockResolvedValue(data);
	await host.onmessage!({
		data: {
			type: 'volume-region',
			id: 2,
			origin: 'https://example.test',
			publicEnv: {},
			payload: { url: 'https://example.test/test.zarr' }
		}
	});
	expect(host.postMessage).toHaveBeenCalledWith({ id: 2, value: data }, [data.values.buffer]);
});
