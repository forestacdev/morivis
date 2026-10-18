import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	appendTestFbxPackage,
	createTestFbxAppearance,
	TEST_ASSET_ID,
	TEST_IMAGE_ID
} from './__fixtures__/test-fbx-appearance';
import { createTestModel } from './__fixtures__/test-model-runtime';
import { applyFbxCurveColors, normalizeFbxImageUv, restoreFbxAppearance } from './fbx-appearance';
import { parseFbxAppearanceData } from './fbx-appearance-data';
import { readFbxPackage, resolveFbxAssetImage } from './fbx-package';
import { ModelMaterials } from './model-materials';

afterEach(() => vi.restoreAllMocks());

describe('FBX appearance', () => {
	it.each([7400, 7700])('FBX %i の材質色とOO接続をモデルIDに対応させる', (version) => {
		const data = parseFbxAppearanceData(createTestFbxAppearance(version));
		expect(data.colorsByModel.get('1')).toEqual([0.25, 0.75, 0.5]);
		expect(data.assetsByModel.get('2')).toBe(TEST_ASSET_ID);
		expect(data.assetsByModel.has('3')).toBe(false);
	});

	it('通常テキスト・切れたバイナリを無視する', () => {
		for (
			const buffer of [
				new TextEncoder().encode('test-ascii').buffer,
				createTestFbxAppearance().slice(0, 55)
			]
		) {
			expect(parseFbxAppearanceData(buffer).colorsByModel.size).toBe(0);
		}
	});

	it('共有材質を分離して曲線色を復元し、未接続の線は変えない', () => {
		const root = new THREE.Group();
		const material = new THREE.LineBasicMaterial({ color: 0x3300ff });
		const dispose = vi.spyOn(material, 'dispose');
		const line = Object.assign(new THREE.Line(new THREE.BufferGeometry(), material), { ID: 1 });
		const other = new THREE.Line(new THREE.BufferGeometry(), material);
		root.add(line, other);
		expect(applyFbxCurveColors(root, parseFbxAppearanceData(createTestFbxAppearance()))).toBe(
			1
		);
		expect(line.material.color.getHex()).toBe(0x40bf80);
		expect(other.material.color.getHex()).toBe(0x3300ff);
		expect(dispose).not.toHaveBeenCalled();
		new ModelMaterials().disposeModelObject(root);
	});

	it('単一画像の実寸UVを正規化し、V方向とタイリングを保つ', () => {
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('uv', new THREE.Float32BufferAttribute([10, 30, 50, 10], 2));
		expect(normalizeFbxImageUv(geometry, 2)).toBe(true);
		expect(Array.from(geometry.getAttribute('uv').array)).toEqual([0, 1, 1, 0]);
		expect(normalizeFbxImageUv(geometry, 2)).toBe(false);
		geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 20, 1], 2));
		expect(normalizeFbxImageUv(geometry, 1)).toBe(false);
		expect(geometry.getAttribute('uv').getX(1)).toBe(20);
		geometry.dispose();
	});

	it('埋め込みZIPとcutoutの参照を復元する', async () => {
		const pkg = await readFbxPackage(
			await appendTestFbxPackage(createTestFbxAppearance(), true)
		);
		expect(pkg.images.size).toBe(2);
		const image = resolveFbxAssetImage(pkg, TEST_ASSET_ID);
		expect(image?.id).toBe(TEST_IMAGE_ID);
		expect(image?.cutout).toBeInstanceOf(Blob);
		expect(resolveFbxAssetImage(pkg, 'test-unknown')).toBeUndefined();
		expect((await readFbxPackage(new ArrayBuffer(8))).images.size).toBe(0);
	});

	it('復元画像をshader更新後も保持し、共有形状と未接続材質を変えずに解放する', async () => {
		vi.spyOn(THREE.ImageLoader.prototype, 'loadAsync').mockResolvedValue(
			{ width: 4, height: 2 } as HTMLImageElement
		);
		const revoke = vi.spyOn(URL, 'revokeObjectURL');
		const { object, entry } = createTestModel();
		const mesh = object.children[0] as THREE.Mesh;
		Object.assign(mesh, { ID: 2 });
		mesh.geometry.setAttribute(
			'uv',
			new THREE.Float32BufferAttribute([10, 30, 50, 10, 10, 10], 2)
		);
		const originalGeometry = mesh.geometry;
		const originalMaterial = mesh.material;
		const other = new THREE.Mesh(originalGeometry, originalMaterial);
		object.add(other);
		const buffer = await appendTestFbxPackage(createTestFbxAppearance());
		expect(await restoreFbxAppearance(object, buffer)).toEqual({
			coloredCurveCount: 0,
			texturedMeshCount: 1
		});
		expect(revoke).toHaveBeenCalledOnce();
		expect(mesh.geometry).not.toBe(originalGeometry);
		expect(other.geometry.getAttribute('uv').getX(0)).toBe(10);
		expect((other.material as THREE.MeshBasicMaterial).map).toBeNull();
		const source = mesh.material as THREE.MeshPhongMaterial;
		const map = source.map!;
		expect(map.flipY).toBe(true);
		expect(map.colorSpace).toBe(THREE.SRGBColorSpace);
		expect(source.color.getHex()).toBe(0xffffff);
		// 切り抜きと画像参照がmorivisのshader差し替えで消えないことを確認する。
		source.alphaTest = 0.5;
		const materials = new ModelMaterials();
		materials.applyStyleToObject(object, entry.style, 'fbx');
		materials.applyStyleToObject(object, { ...entry.style, opacity: 0.5 }, 'fbx');
		const shader = mesh.material as THREE.ShaderMaterial;
		expect(shader.uniforms.uMap.value).toBe(map);
		expect(shader.uniforms.uSourceAlphaTest.value).toBe(0.5);
		const dispose = vi.spyOn(map, 'dispose');
		materials.disposeModelObject(object);
		expect(dispose).toHaveBeenCalledOnce();
	});

	it('画像の復号に失敗してもモデルの読み込みは続ける', async () => {
		vi.spyOn(THREE.ImageLoader.prototype, 'loadAsync').mockRejectedValue(
			new Error('test-image-error')
		);
		const { object } = createTestModel();
		Object.assign(object.children[0], { ID: 2 });
		expect(
			(await restoreFbxAppearance(
				object,
				await appendTestFbxPackage(createTestFbxAppearance())
			)).texturedMeshCount
		).toBe(0);
		new ModelMaterials().disposeModelObject(object);
	});
});
