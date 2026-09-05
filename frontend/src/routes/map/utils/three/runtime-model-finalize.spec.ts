import { describe, expect, it } from 'vitest';

import type { ProjectedModelGeoreference } from '$routes/map/data/types/model';
import * as THREE from 'three';

import { finalizeRuntimeModelObject } from './runtime-model-finalize';

describe('finalizeRuntimeModelObject', () => {
	it('projected georeference を object に適用する', () => {
		const object = new THREE.Group();
		const georeference: ProjectedModelGeoreference = {
			type: 'projected',
			epsg: '6677',
			projectedOrigin: [100, 200, 30],
			unitScaleMeters: 1
		};

		finalizeRuntimeModelObject(object, {
			formatType: 'obj',
			georeference
		});

		expect(object.position.toArray()).toEqual([-100, -200, -30]);
	});

	it('Y-up のローカルモデルは最下端を地図の高さ 0 に合わせる', () => {
		const geometry = new THREE.BoxGeometry(10, 20, 30);
		const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
		mesh.position.set(100, 200, 300);
		mesh.updateMatrixWorld(true);

		finalizeRuntimeModelObject(mesh, {
			formatType: 'gltf',
			normalizeToLocalOrigin: true
		});

		const box = new THREE.Box3().setFromObject(mesh);
		expect(box.min.x).toBeCloseTo(-5, 6);
		expect(box.max.x).toBeCloseTo(5, 6);
		expect(box.min.y).toBeCloseTo(0, 6);
		expect(box.max.y).toBeCloseTo(20, 6);
		expect(box.min.z).toBeCloseTo(-15, 6);
		expect(box.max.z).toBeCloseTo(15, 6);
	});

	it('Z-up のローカルモデルは最下端を地図の高さ 0 に合わせる', () => {
		const geometry = new THREE.BoxGeometry(10, 20, 30);
		const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
		mesh.position.set(100, 200, 300);
		mesh.updateMatrixWorld(true);

		finalizeRuntimeModelObject(mesh, {
			formatType: 'fbx',
			normalizeToLocalOrigin: true
		});

		const box = new THREE.Box3().setFromObject(mesh);
		expect(box.min.x).toBeCloseTo(-5, 6);
		expect(box.max.x).toBeCloseTo(5, 6);
		expect(box.min.y).toBeCloseTo(-10, 6);
		expect(box.max.y).toBeCloseTo(10, 6);
		expect(box.min.z).toBeCloseTo(0, 6);
		expect(box.max.z).toBeCloseTo(30, 6);
	});

	it('PMX は Y-up のローカルモデルとして最下端を地図の高さ 0 に合わせる', () => {
		const geometry = new THREE.BoxGeometry(10, 20, 30);
		const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
		mesh.position.set(100, 200, 300);
		mesh.updateMatrixWorld(true);

		finalizeRuntimeModelObject(mesh, {
			formatType: 'pmx',
			normalizeToLocalOrigin: true
		});

		const box = new THREE.Box3().setFromObject(mesh);
		expect(box.min.y).toBeCloseTo(0, 6);
		expect(box.max.y).toBeCloseTo(20, 6);
	});
});
