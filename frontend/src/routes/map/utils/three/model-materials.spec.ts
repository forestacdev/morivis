import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createTestModel } from './__fixtures__/test-model-runtime';
import { ModelMaterials } from './model-materials';

describe('ModelMaterials', () => {
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
