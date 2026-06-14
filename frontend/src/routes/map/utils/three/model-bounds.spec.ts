import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('$app/paths', () => ({
	asset: (path: string) => path
}));

vi.mock('$routes/stores/map', () => ({
	mapStore: {
		getTerrain: () => false
	}
}));

const readFixtureFile = (fileName: string): File => {
	const absolutePath = resolve(import.meta.dirname, '__fixtures__', fileName);
	const bytes = readFileSync(absolutePath);
	return new File([bytes], fileName, {
		type: 'model/gltf-binary'
	});
};

describe('computeUploadedModelMeta', () => {
	beforeAll(() => {
		if (!globalThis.URL.createObjectURL) {
			globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
		}
		if (!globalThis.URL.revokeObjectURL) {
			globalThis.URL.revokeObjectURL = vi.fn();
		}
	});

	it('GLB fixture から bounds とスケール情報を計算できる', async () => {
		const { computeUploadedModelMeta } = await import('./model-bounds');
		const file = readFixtureFile('box.glb');

		const result = await computeUploadedModelMeta({
			file,
			format: 'gltf',
			style: {
				transform: {
					lng: 139.6917,
					lat: 35.6895,
					altitude: 0,
					heightOffset: 0,
					heightScale: 1,
					baseScale: 1,
					baseRotationX: 0,
					baseRotationY: 0,
					baseRotationZ: 0,
					scale: 1,
					rotationX: 0,
					rotationY: 0,
					rotationZ: 0
				}
			}
		});

		expect(result.localMaxDimension).toBeGreaterThan(0);
		expect(result.scaleMultiplier).toBeGreaterThanOrEqual(1);
		expect(result.hasSkinnedMesh).toBe(false);
		expect(result.animationNames).toEqual([]);
		expect(result.bounds[0]).toBeLessThan(result.bounds[2]);
		expect(result.bounds[1]).toBeLessThan(result.bounds[3]);
		expect(result.bounds[0]).toBeCloseTo(139.6917, 3);
		expect(result.bounds[1]).toBeCloseTo(35.6895, 3);
		expect(result.xyzImageTile.z).toBeGreaterThanOrEqual(0);
	});
});
