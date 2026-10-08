import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createTestModel } from './__fixtures__/test-model-runtime';
import { ModelMaterials } from './model-materials';

describe('ModelMaterials', () => {
	it('材質ごとの描画面を保持し、両面・表面のみから元データへ戻せる', () => {
		const { entry, object } = createTestModel();
		const mesh = object.children[0] as THREE.Mesh;
		(mesh.material as THREE.Material).dispose();
		const sides = [THREE.FrontSide, THREE.DoubleSide, THREE.BackSide] as const;
		mesh.material = sides.map(side => new THREE.MeshBasicMaterial({ side }));
		entry.style.edge = { enabled: true, color: '#000000', thickness: 0.01 };
		const materials = new ModelMaterials();
		// 古い保存データでプロパティがない場合も、元の材質を使う。
		delete entry.style.faceSide;
		materials.applyStyleToObject(object, entry.style, 'gltf');
		const shaders = mesh.material as THREE.ShaderMaterial[];
		const overlay = mesh.children.find(child =>
			child.userData.morivisEdgeOverlay
		) as THREE.Mesh;
		const edgeMaterials = overlay.material as THREE.ShaderMaterial[];
		expect(shaders.map(material => material.side)).toEqual(sides);
		expect(edgeMaterials.map(material => material.side)).toEqual(sides);

		for (
			const [faceSide, expected] of [
				['double', sides.map(() => THREE.DoubleSide)],
				['front', sides.map(() => THREE.FrontSide)],
				['source', sides]
			] as const
		) {
			entry.style.faceSide = faceSide;
			materials.applyStyleToObject(object, entry.style, 'gltf');
			expect(mesh.material).toBe(shaders);
			expect(shaders.map(material => material.side)).toEqual(expected);
			expect(edgeMaterials.map(material => material.side)).toEqual(expected);
		}
		const versions = shaders.map(material => material.version);
		expect(versions.every(version => version > 0)).toBe(true);
		materials.applyStyleToObject(object, entry.style, 'gltf');
		expect(shaders.map(material => material.version)).toEqual(versions);
		materials.disposeModelObject(object);
	});

	it('表面のみでは裏から選択されず、両面へ変更すると選択できる', () => {
		const { entry, object } = createTestModel();
		const mesh = object.children[0] as THREE.Mesh;
		mesh.geometry.dispose();
		mesh.geometry = new THREE.PlaneGeometry(2, 2);
		const materials = new ModelMaterials();
		const backRay = new THREE.Raycaster(
			new THREE.Vector3(0.1, 0.2, -2),
			new THREE.Vector3(0, 0, 1)
		);
		const frontRay = new THREE.Raycaster(
			new THREE.Vector3(0.1, 0.2, 2),
			new THREE.Vector3(0, 0, -1)
		);
		for (const faceSide of ['source', 'double', 'front', 'source'] as const) {
			materials.applyStyleToObject(object, { ...entry.style, faceSide }, 'fbx');
			expect(backRay.intersectObject(mesh).length > 0).toBe(faceSide === 'double');
			expect(frontRay.intersectObject(mesh)).toHaveLength(1);
		}
		materials.disposeModelObject(object);
	});

	it('材質を再利用してstyleを更新し、形状・モーフ状態・親を保つ', () => {
		const { entry, object } = createTestModel();
		const mesh = object.children[0] as THREE.Mesh;
		const geometry = mesh.geometry;
		mesh.morphTargetInfluences = [0.5];
		const scene = new THREE.Scene();
		scene.add(object);
		const materials = new ModelMaterials();
		materials.applyStyleToObject(object, entry.style, 'gltf');
		const shader = mesh.material as THREE.ShaderMaterial;
		materials.applyStyleToObject(
			object,
			{ ...entry.style, color: '#ff0000', wireframe: true },
			'gltf'
		);
		expect(mesh.material).toBe(shader);
		expect(shader.wireframe).toBe(true);
		expect(mesh.geometry).toBe(geometry);
		expect(mesh.morphTargetInfluences).toEqual([0.5]);
		expect(object.parent).toBe(scene);
		materials.disposeModelObject(object);
	});
	it('差し替えたshaderと保存された元材質、形状を解放する', () => {
		const { entry, object } = createTestModel();
		const mesh = object.children[0] as THREE.Mesh;
		const geometryDispose = vi.spyOn(mesh.geometry, 'dispose');
		const originalDispose = vi.spyOn(mesh.material as THREE.Material, 'dispose');
		const materials = new ModelMaterials();
		materials.applyStyleToObject(object, entry.style, 'gltf');
		const shaderDispose = vi.spyOn(mesh.material as THREE.Material, 'dispose');
		materials.disposeModelObject(object);
		expect(geometryDispose).toHaveBeenCalledOnce();
		expect(originalDispose).toHaveBeenCalledOnce();
		expect(shaderDispose).toHaveBeenCalledOnce();
	});
});
