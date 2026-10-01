import { Matrix4, PerspectiveCamera, Vector2, Vector3, Vector4 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { VoxelSpec } from './spec';
import {
	createVolumeRegion,
	releaseVolumeRegion,
	updateVolumeCamera,
	updateVolumeRegion
} from './volume-mesh';

const spec: VoxelSpec = {
	id: 'test-volume',
	type: 'volume',
	density: 2,
	url: 'https://example.test/test.zarr',
	arrayPath: 'detail',
	visible: true,
	opacity: 1,
	min: 0,
	max: 8,
	threshold: 0,
	heightScale: 1,
	colorMap: 'jet'
};
const data = () => ({
	values: new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]),
	dimensions: [2, 2, 2] as [number, number, number],
	bounds: [-10, 40, 10, 60, 0, 2000] as [number, number, number, number, number, number],
	anchor: [0.5, 0.3] as [number, number]
});
const uniforms = () => ({
	voxelAnchor: { value: new Vector2(0.5, 0.3) },
	voxelFlat: { value: new Matrix4() },
	voxelGlobe: { value: new Matrix4() },
	voxelTransition: { value: 0 },
	voxelClip: { value: new Vector4() }
});

describe('3Dテクスチャの更新と解放', () => {
	it('GPUの寸法上限を確保前に検査する', () => {
		expect(() => createVolumeRegion(data(), false, uniforms(), true, 1)).toThrow('上限');
	});
	it('濃さ・色・高度の更新で観測値を作り直さず、全GPUリソースを解放する', () => {
		const region = createVolumeRegion(data(), false, uniforms(), true, 2048);
		updateVolumeRegion(region, spec);
		const values = region.texture.image.data, maxZ = region.material.uniforms.boxMax.value.z;
		const oldPalette = new Uint8Array(region.colors.image.data.buffer).slice();
		updateVolumeRegion(region, {
			...spec,
			heightScale: 5,
			density: 4,
			threshold: 2,
			colorMap: 'viridis'
		});
		expect(region.material.uniforms.boxMax.value.z).toBeCloseTo(maxZ * 5, 10);
		expect(region.material.uniforms.density.value).toBe(4);
		expect(region.material.uniforms.threshold.value).toBe(2);
		expect(region.texture.image.data).toBe(values);
		expect(region.colors.image.data).not.toEqual(oldPalette);
		const dispose = vi.fn();
		for (
			const resource of [region.texture, region.colors, region.material, region.mesh.geometry]
		) resource.addEventListener('dispose', dispose);
		releaseVolumeRegion(region);
		expect(dispose).toHaveBeenCalledTimes(4);
	});
	it('透視投影のカメラをテクスチャ空間へ戻す', () => {
		const u = uniforms(), region = createVolumeRegion(data(), false, u, true, 2048);
		const camera = new PerspectiveCamera(45, 1, 0.001, 10);
		camera.position.set(0.02, 0.05, 0.1);
		camera.lookAt(0, 0, 0);
		camera.updateMatrixWorld();
		u.voxelFlat.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
		updateVolumeRegion(region, spec);
		updateVolumeCamera(region, u);
		const min = region.material.uniforms.boxMin.value,
			max = region.material.uniforms.boxMax.value;
		const origin = region.material.uniforms.rayOrigin.value.clone().multiply(
			new Vector3().subVectors(max, min)
		).add(min);
		expect(origin.distanceTo(camera.position)).toBeLessThan(1e-8);
		releaseVolumeRegion(region);
	});
});
