import { createGlbEntry } from '$routes/map/data/entries/model';
import * as THREE from 'three';
import type { LoadedModel } from '../model-runtime-types';

/** 実在データやネットワークを必要としない、単純な箱モデル。 */
export const createTestModel = (id = 'test-model') => {
	const entry = createGlbEntry(id, `https://example.test/${id}.glb`, {
		lng: 0,
		lat: 0,
		altitude: 0
	});
	entry.id = id;
	entry.style.visible = true;
	const object = new THREE.Group();
	object.userData.entryId = id;
	object.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial()));
	return { entry, object, transform: { matrix: new THREE.Matrix4() } } satisfies LoadedModel;
};
