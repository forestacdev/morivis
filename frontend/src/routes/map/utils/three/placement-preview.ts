import type { ModelLocalBounds } from '$routes/map/data/types/model';
import * as THREE from 'three';

// 2D の座標系選択と同じ赤い斜線パターンを 3D 配置プレビューにも使う。
const PATTERN_COLOR = { r: 255, g: 0, b: 0 };
const PATTERN_SIZE = 64;
const PATTERN_SPACING = 16;
const PATTERN_STRIPE_WIDTH = 4;

export const DEFAULT_PLACEMENT_PREVIEW_BOUNDS: ModelLocalBounds = [-10, -10, 0, 10, 10, 12];

export const getPlacementPreviewBounds = (entry: {
	format: { localBounds?: ModelLocalBounds; };
}): ModelLocalBounds => entry.format.localBounds ?? DEFAULT_PLACEMENT_PREVIEW_BOUNDS;

export const getPlacementPreviewBoundsKey = (bounds: ModelLocalBounds) => bounds.join(':');

const createPlacementPreviewTexture = () => {
	const data = new Uint8Array(PATTERN_SIZE * PATTERN_SIZE * 4);
	for (let y = 0; y < PATTERN_SIZE; y += 1) {
		for (let x = 0; x < PATTERN_SIZE; x += 1) {
			const index = (y * PATTERN_SIZE + x) * 4;
			const diagonal = ((x + y) % PATTERN_SPACING + PATTERN_SPACING) % PATTERN_SPACING;
			const distanceToStripe = Math.min(diagonal, PATTERN_SPACING - diagonal);
			data[index] = PATTERN_COLOR.r;
			data[index + 1] = PATTERN_COLOR.g;
			data[index + 2] = PATTERN_COLOR.b;
			data[index + 3] = distanceToStripe <= PATTERN_STRIPE_WIDTH ? 196 : 88;
		}
	}

	const texture = new THREE.DataTexture(data, PATTERN_SIZE, PATTERN_SIZE, THREE.RGBAFormat);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(8, 8);
	texture.needsUpdate = true;
	return texture;
};

export const createPlacementPreviewObject = (bounds: ModelLocalBounds) => {
	const [minX, minY, minZ, maxX, maxY, maxZ] = bounds;
	const width = Math.max(maxX - minX, 0.01);
	const height = Math.max(maxY - minY, 0.01);
	const depth = Math.max(maxZ - minZ, 0.01);
	const center = new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
	const object = new THREE.Group();
	const geometry = new THREE.BoxGeometry(width, height, depth);
	const surface = new THREE.Mesh(
		geometry,
		new THREE.MeshBasicMaterial({
			map: createPlacementPreviewTexture(),
			transparent: true,
			depthWrite: false
		})
	);
	surface.position.copy(center);
	const edges = new THREE.LineSegments(
		new THREE.EdgesGeometry(geometry),
		new THREE.LineBasicMaterial({ color: 0xffffff })
	);
	edges.position.copy(center);
	object.add(surface, edges);
	return object;
};

export const disposePlacementPreviewObject = (object: THREE.Group) => {
	object.traverse((child) => {
		if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
		const material = (child as THREE.Mesh).material;
		const disposeMaterial = (value: THREE.Material) => {
			const texture = (value as THREE.Material & { map?: THREE.Texture; }).map;
			texture?.dispose();
			value.dispose();
		};
		if (Array.isArray(material)) material.forEach(disposeMaterial);
		else if (material) disposeMaterial(material);
	});
};
