import * as THREE from 'three';

export const normalizeObjectToLocalOrigin = (object: THREE.Object3D) => {
	object.updateMatrixWorld(true);
	const box = new THREE.Box3().setFromObject(object);
	if (box.isEmpty()) return;

	const center = box.getCenter(new THREE.Vector3());
	object.position.x -= center.x;
	object.position.y -= center.y;
	object.position.z -= box.min.z;
	object.updateMatrixWorld(true);
};

export const centerObjectToLocalOrigin = (object: THREE.Object3D) => {
	object.updateMatrixWorld(true);
	const box = new THREE.Box3().setFromObject(object);
	if (box.isEmpty()) return;

	const center = box.getCenter(new THREE.Vector3());
	object.position.x -= center.x;
	object.position.y -= center.y;
	object.position.z -= center.z;
	object.updateMatrixWorld(true);
};
