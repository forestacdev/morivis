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

const createSyntheticUsdFile = (): File =>
	new File(
		[
			`#usda 1.0
def Xform "Root"
{
	def Mesh "Triangle"
	{
		int[] faceVertexCounts = [3]
		int[] faceVertexIndices = [0, 1, 2]
		point3f[] points = [(0, 0, 0), (2, 0, 0), (0, 3, 0)]
	}
}`
		],
		'synthetic.usda',
		{ type: 'model/vnd.usda' }
	);

const createKtx2TextureGltfFile = (): File => {
	const binary = new Uint8Array(40);
	new Float32Array(binary.buffer, 0, 9).set([0, 0, 0, 2, 0, 0, 0, 3, 0]);
	const json = new TextEncoder().encode(
		JSON.stringify({
			asset: { version: '2.0' },
			extensionsUsed: ['KHR_texture_basisu'],
			extensionsRequired: ['KHR_texture_basisu'],
			buffers: [{ byteLength: binary.byteLength }],
			bufferViews: [
				{ buffer: 0, byteOffset: 0, byteLength: 36 },
				{ buffer: 0, byteOffset: 36, byteLength: 1 }
			],
			accessors: [
				{
					bufferView: 0,
					componentType: 5126,
					count: 3,
					type: 'VEC3',
					min: [0, 0, 0],
					max: [2, 3, 0]
				}
			],
			images: [{ bufferView: 1, mimeType: 'image/ktx2' }],
			textures: [{ extensions: { KHR_texture_basisu: { source: 0 } } }],
			materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
			meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
			nodes: [{ mesh: 0 }],
			scenes: [{ nodes: [0] }],
			scene: 0
		})
	);
	const jsonLength = Math.ceil(json.byteLength / 4) * 4;
	const glb = new Uint8Array(12 + 8 + jsonLength + 8 + binary.byteLength);
	const view = new DataView(glb.buffer);
	view.setUint32(0, 0x46546c67, true);
	view.setUint32(4, 2, true);
	view.setUint32(8, glb.byteLength, true);
	view.setUint32(12, jsonLength, true);
	view.setUint32(16, 0x4e4f534a, true);
	glb.fill(0x20, 20, 20 + jsonLength);
	glb.set(json, 20);
	view.setUint32(20 + jsonLength, binary.byteLength, true);
	view.setUint32(24 + jsonLength, 0x004e4942, true);
	glb.set(binary, 28 + jsonLength);

	return new File([glb], 'synthetic-ktx2.glb', { type: 'model/gltf-binary' });
};

describe('computeUploadedModelMeta', () => {
	beforeAll(() => {
		if (!('self' in globalThis)) {
			Object.defineProperty(globalThis, 'self', {
				value: globalThis,
				configurable: true
			});
		}
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
		expect(result.localBounds[0]).toBeLessThan(result.localBounds[3]);
		expect(result.localBounds[1]).toBeLessThan(result.localBounds[4]);
		expect(result.localBounds[2]).toBeLessThan(result.localBounds[5]);
		expect(result.bounds[0]).toBeCloseTo(139.6917, 3);
		expect(result.bounds[1]).toBeCloseTo(35.6895, 3);
		expect(result.xyzImageTile.z).toBeGreaterThanOrEqual(0);
	});

	it('USD の形状範囲を取得できる', async () => {
		const { getUploadedModelObject } = await import('./model-bounds');
		const { object } = await getUploadedModelObject(createSyntheticUsdFile(), 'usd');
		const box = new THREE.Box3().setFromObject(object);

		expect(box.min.toArray()).toEqual([0, 0, 0]);
		expect(box.max.toArray()).toEqual([2, 3, 0]);
	});

	it('KTX2 テクスチャを含む GLTF でも形状範囲を取得できる', async () => {
		const { getUploadedModelObject } = await import('./model-bounds');
		const { object } = await getUploadedModelObject(createKtx2TextureGltfFile(), 'gltf');
		const box = new THREE.Box3().setFromObject(object);

		expect(box.min.toArray()).toEqual([0, 0, 0]);
		expect(box.max.toArray()).toEqual([2, 3, 0]);
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
