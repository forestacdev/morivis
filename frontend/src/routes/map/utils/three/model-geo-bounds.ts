import type { ModelLocalBounds, ModelTransformStyle } from '$routes/map/data/types/model';
import { buildMercatorModelMatrix } from '$routes/map/utils/three/mercator-model-matrix';
import * as THREE from 'three';

const mercatorXToLng = (x: number) => x * 360 - 180;

const mercatorYToLat = (y: number) => {
	const n = Math.PI * (1 - 2 * y);
	return THREE.MathUtils.radToDeg(Math.atan(Math.sinh(n)));
};

export const getModelGeoBoundsFromLocalBounds = (
	localBounds: ModelLocalBounds,
	style: ModelTransformStyle
): [number, number, number, number] => {
	const [minX, minY, minZ, maxX, maxY, maxZ] = localBounds;
	const matrix = buildMercatorModelMatrix(style.transform, false);
	const corners = [
		new THREE.Vector3(minX, minY, minZ),
		new THREE.Vector3(minX, minY, maxZ),
		new THREE.Vector3(minX, maxY, minZ),
		new THREE.Vector3(minX, maxY, maxZ),
		new THREE.Vector3(maxX, minY, minZ),
		new THREE.Vector3(maxX, minY, maxZ),
		new THREE.Vector3(maxX, maxY, minZ),
		new THREE.Vector3(maxX, maxY, maxZ)
	];

	let west = Number.POSITIVE_INFINITY;
	let south = Number.POSITIVE_INFINITY;
	let east = Number.NEGATIVE_INFINITY;
	let north = Number.NEGATIVE_INFINITY;
	for (const corner of corners) {
		const world = corner.applyMatrix4(matrix);
		west = Math.min(west, mercatorXToLng(world.x));
		south = Math.min(south, mercatorYToLat(world.y));
		east = Math.max(east, mercatorXToLng(world.x));
		north = Math.max(north, mercatorYToLat(world.y));
	}

	return [west, south, east, north];
};
