import { parseGpmLayout } from '$routes/map/protocol/geozarr/gpm';
import { createVoxelCells } from '$routes/map/protocol/geozarr/voxels';
import { createTestRegionalZarr } from '$routes/map/utils/formats/geozarr/__fixtures__/test-regions';
import type { Map as MapLibreMap } from '$routes/map/utils/maplibre';
import { type InstancedMesh, Matrix4 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeoZarrVoxelLayerManager } from './layer-manager';
import type { VoxelSpec } from './spec';

const mocks = vi.hoisted(() => ({
	registerGeoZarr: vi.fn(),
	readGeoZarrVoxelRegion: vi.fn(),
	readGeoZarrVolumeRegion: vi.fn(),
	render: vi.fn(),
	dispose: vi.fn()
}));
vi.mock('$routes/map/protocol/geozarr', () => mocks);
vi.mock(
	'three',
	async importOriginal => ({
		...await importOriginal<typeof import('three')>(),
		WebGLRenderer: class {
			autoClear = false;
			resetState = () => {};
			render = mocks.render;
			dispose = mocks.dispose;
		}
	})
);
const layout = () =>
	parseGpmLayout(
		JSON.parse(new TextDecoder().decode(createTestRegionalZarr().get('zarr.json'))).attributes
			.gpm,
		'detail',
		{ shape: [2, 2, 2, 2], chunks: [1, 2, 2, 2], dtype: 'float32' }
	)!;
const spec: VoxelSpec = {
	type: 'voxel',
	density: 2,
	id: 'test-voxel',
	url: 'https://example.test/test.zarr',
	arrayPath: 'detail',
	visible: true,
	opacity: 1,
	min: 0,
	max: 8,
	colorMap: 'jet',
	threshold: 0,
	heightScale: 1
};
const fakeGl = () => ({
	getParameter: () => 2048,
	getExtension: () => ({})
} as unknown as WebGL2RenderingContext);
const fakeMap = () => ({
	getCanvas: () => ({}),
	on: vi.fn(),
	off: vi.fn(),
	fire: vi.fn(),
	triggerRepaint: vi.fn(),
	getCenter: () => ({ lng: 0, lat: 50 }),
	getZoom: () => 6,
	getBounds: () => ({
		getWest: () => -50,
		getEast: () => 50,
		getSouth: () => 30,
		getNorth: () => 70
	})
});
afterEach(() => vi.clearAllMocks());

describe('ボクセルruntimeの更新と破棄', () => {
	it('色・閾値・倍率は読み直さずに反映し、削除時にGPUを解放する', async () => {
		const metadata = layout();
		mocks.registerGeoZarr.mockResolvedValue({ gpm: metadata });
		mocks.readGeoZarrVoxelRegion.mockImplementation(async input =>
			createVoxelCells(metadata, input.region, [1, 4, 0, 0, 0, 0, 0, 0])
		);
		const manager = new GeoZarrVoxelLayerManager(),
			map = fakeMap(),
			layer = manager.createLayer();
		manager.setSpecs([spec]);
		layer.onAdd!(map as unknown as MapLibreMap, fakeGl());
		await vi.waitFor(() => expect(mocks.readGeoZarrVoxelRegion).toHaveBeenCalledTimes(2));
		const meshes: InstancedMesh[] = [];
		mocks.render.mockImplementation(scene => meshes.push(scene.children[0]));
		const render = () =>
			layer.render(
				{} as WebGL2RenderingContext,
				{
					defaultProjectionData: {
						mainMatrix: new Matrix4().toArray(),
						fallbackMatrix: new Matrix4().toArray(),
						projectionTransition: 0,
						clippingPlane: [0, 0, 0, 0]
					}
				} as unknown as Parameters<typeof layer.render>[1]
			);
		render();
		expect(meshes.length).toBe(2);
		expect(meshes[0].count).toBe(2);
		const disposed = vi.fn();
		meshes[0].addEventListener('dispose', disposed);
		manager.setSpecs([{ ...spec, threshold: 2, heightScale: 5, colorMap: 'viridis' }]);
		expect(meshes[0].count).toBe(1);
		expect(meshes[0].scale.z).toBe(5);
		expect(mocks.readGeoZarrVoxelRegion).toHaveBeenCalledTimes(2);
		manager.setSpecs([]);
		expect(disposed).toHaveBeenCalledOnce();
		manager.dispose();
		expect(map.off).toHaveBeenCalledWith('moveend', expect.any(Function));
	});
	it('読み込み中の削除で要求を中断し、遅い結果で描画を復活させない', async () => {
		mocks.registerGeoZarr.mockResolvedValue({ gpm: layout() });
		const signals: AbortSignal[] = [];
		mocks.readGeoZarrVoxelRegion.mockImplementation((_input, signal) => {
			signals.push(signal);
			return new Promise((_resolve, reject) =>
				signal.addEventListener(
					'abort',
					() => reject(new DOMException('Aborted', 'AbortError'))
				)
			);
		});
		const manager = new GeoZarrVoxelLayerManager(),
			map = fakeMap(),
			layer = manager.createLayer();
		manager.setSpecs([spec]);
		layer.onAdd!(map as unknown as MapLibreMap, fakeGl());
		await vi.waitFor(() => expect(signals.length).toBe(2));
		manager.dispose();
		expect(signals.every(s => s.aborted)).toBe(true);
		await Promise.resolve();
		expect(map.fire).not.toHaveBeenCalled();
	});
});
