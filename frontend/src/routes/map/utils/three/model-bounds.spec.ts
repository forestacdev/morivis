import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as THREE from 'three';
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

	it('FBX の地理配置用範囲は原点付近のポリラインを除外する', async () => {
		const { getModelBounds } = await import('./model-bounds');
		const object = new THREE.Group();
		const mesh = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 5));
		mesh.position.set(-20_000, -55_000, 20);
		const line = new THREE.Line(
			new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(0, 0, 0),
				new THREE.Vector3(10, 10, 10)
			])
		);
		object.add(mesh, line);
		object.updateMatrixWorld(true);

		const fbxBounds = getModelBounds(object, 'fbx');
		const gltfBounds = getModelBounds(object, 'gltf');

		expect(fbxBounds.getCenter(new THREE.Vector3()).toArray()).toEqual([-20_000, -55_000, 20]);
		expect(gltfBounds.max.x).toBe(10);
		expect(gltfBounds.max.y).toBe(10);
	});

	it('ルート軸変換を除いた入力座標系の範囲を取得する', async () => {
		const { getRootLocalSourceBounds } = await import('./model-bounds');
		const scene = new THREE.Group();
		const root = new THREE.Group();
		const mesh = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 5));
		root.rotation.x = -Math.PI / 2;
		mesh.position.set(43_860, -56_880, 10);
		root.add(mesh);
		scene.add(root);
		scene.updateMatrixWorld(true);

		const sourceBounds = getRootLocalSourceBounds(scene);

		expect(sourceBounds.getCenter(new THREE.Vector3()).toArray()).toEqual([
			43_860,
			-56_880,
			10
		]);
	});

	it('web-ifc-threeのY-up座標をIFCのZ-up座標へ戻す', async () => {
		const { getIfcSourceBounds } = await import('./model-bounds');
		const sourceBounds = getIfcSourceBounds(
			new THREE.Box3(
				new THREE.Vector3(43_835, 2.5, 56_867),
				new THREE.Vector3(43_891, 19, 56_888)
			)
		);

		expect(sourceBounds.min.toArray()).toEqual([43_835, -56_888, 2.5]);
		expect(sourceBounds.max.toArray()).toEqual([43_891, -56_867, 19]);
	});
});
