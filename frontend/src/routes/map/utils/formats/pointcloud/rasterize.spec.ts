import { expect, it, vi } from 'vitest';

const worker = vi.hoisted(() => ({
	postMessage: vi.fn(),
	terminate: vi.fn(),
	onmessage: null as ((event: { data: unknown; }) => void) | null
}));
vi.mock('./rasterize.worker?worker', () => ({ default: vi.fn(() => worker) }));

import { rasterizePointCloudToDemInWorker } from './rasterize';

it('DEMワーカーへ倍精度座標と投影法を渡し、元の入力を保持する', async () => {
	const positions = new Float64Array([1000000.001, 2000000.002, 10]);
	const params = {
		positions,
		projectionDefinition: 'EPSG:3857',
		bbox: [0, 0, 1, 1] as [number, number, number, number],
		longEdgePixels: 3
	};
	const pending = rasterizePointCloudToDemInWorker(params);
	expect(worker.postMessage).toHaveBeenCalledWith(params);
	const result = { band: new Float32Array([10]), width: 1, height: 1, nodata: -9999 };
	worker.onmessage?.({ data: result });
	await expect(pending).resolves.toEqual(result);
	expect([...positions]).toEqual([1000000.001, 2000000.002, 10]);
	expect(worker.terminate).toHaveBeenCalledOnce();
});
