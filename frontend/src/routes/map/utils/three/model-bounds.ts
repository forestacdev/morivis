import maplibregl from 'maplibre-gl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

import type { TileXYZ } from '$routes/map/data/types/raster';
import { findCenterTile } from '$routes/map/utils/map/tile';
import type { MeshStyle } from '$routes/map/data/types/model';
import { calculateModelTransform } from '$routes/map/utils/three/model-transform';

interface ComputeUploadedModelMetaParams {
	file: File;
	format: 'gltf' | 'obj';
	style: Pick<MeshStyle, 'transform'>;
}

interface UploadedModelMeta {
	bounds: [number, number, number, number];
	xyzImageTile: TileXYZ;
	scaleMultiplier: number;
	localMaxDimension: number;
	hasSkinnedMesh: boolean;
}

const gltfLoader = new GLTFLoader();
const objLoader = new OBJLoader();
const MIN_MODEL_MAX_DIMENSION_METERS = 1;
const TARGET_MODEL_MAX_DIMENSION_METERS = 5;

const parseGltfObject = async (file: File): Promise<THREE.Object3D> => {
	const buffer = await file.arrayBuffer();

	return new Promise<THREE.Object3D>((resolve, reject) => {
		gltfLoader.parse(
			buffer,
			'',
			(gltf) => {
				resolve(gltf.scene);
			},
			(error) => {
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		);
	});
};

const parseObjObject = async (file: File): Promise<THREE.Object3D> => {
	const text = await file.text();
	return objLoader.parse(text);
};

const getUploadedModelObject = async (file: File, format: 'gltf' | 'obj') => {
	if (format === 'obj') {
		return parseObjObject(file);
	}

	return parseGltfObject(file);
};

const mercatorXToLng = (x: number) => x * 360 - 180;

const mercatorYToLat = (y: number) => {
	const n = Math.PI * (1 - 2 * y);
	return THREE.MathUtils.radToDeg(Math.atan(Math.sinh(n)));
};

export const computeUploadedModelMeta = async ({
	file,
	format,
	style
}: ComputeUploadedModelMetaParams): Promise<UploadedModelMeta> => {
	const object = await getUploadedModelObject(file, format);
	object.updateMatrixWorld(true);

	const box = new THREE.Box3().setFromObject(object);
	if (box.isEmpty()) {
		throw new Error('3Dモデルの範囲を取得できませんでした');
	}
	let hasSkinnedMesh = false;
	object.traverse((child) => {
		if ((child as THREE.SkinnedMesh).isSkinnedMesh === true) {
			hasSkinnedMesh = true;
		}
	});
	const size = box.getSize(new THREE.Vector3());
	const localMaxDimension = Math.max(size.x, size.y, size.z);
	const scaleMultiplier =
		localMaxDimension > 1e-6 && localMaxDimension < MIN_MODEL_MAX_DIMENSION_METERS
			? TARGET_MODEL_MAX_DIMENSION_METERS / localMaxDimension
			: 1;

	const transform = calculateModelTransform({
		type: 'mesh',
		opacity: 1,
		wireframe: false,
		color: '#ffffff',
		transform: {
			...style.transform,
			baseScale: (style.transform.baseScale ?? 1) * scaleMultiplier
		}
	});
	const rotationX = new THREE.Matrix4().makeRotationAxis(
		new THREE.Vector3(1, 0, 0),
		transform.rotateX
	);
	const rotationY = new THREE.Matrix4().makeRotationAxis(
		new THREE.Vector3(0, 1, 0),
		transform.rotateY
	);
	const rotationZ = new THREE.Matrix4().makeRotationAxis(
		new THREE.Vector3(0, 0, 1),
		transform.rotateZ
	);
	const scaleMatrix = new THREE.Matrix4().makeScale(
		transform.scaleX,
		-transform.scaleY,
		transform.scaleZ
	);
	const modelMatrix = new THREE.Matrix4()
		.makeTranslation(transform.translateX, transform.translateY, transform.translateZ)
		.multiply(rotationX)
		.multiply(rotationY)
		.multiply(rotationZ)
		.multiply(scaleMatrix);

	const corners = [
		new THREE.Vector3(box.min.x, box.min.y, box.min.z),
		new THREE.Vector3(box.min.x, box.min.y, box.max.z),
		new THREE.Vector3(box.min.x, box.max.y, box.min.z),
		new THREE.Vector3(box.min.x, box.max.y, box.max.z),
		new THREE.Vector3(box.max.x, box.min.y, box.min.z),
		new THREE.Vector3(box.max.x, box.min.y, box.max.z),
		new THREE.Vector3(box.max.x, box.max.y, box.min.z),
		new THREE.Vector3(box.max.x, box.max.y, box.max.z)
	];

	let west = Number.POSITIVE_INFINITY;
	let south = Number.POSITIVE_INFINITY;
	let east = Number.NEGATIVE_INFINITY;
	let north = Number.NEGATIVE_INFINITY;

	corners.forEach((corner) => {
		const world = corner.clone().applyMatrix4(modelMatrix);
		const lng = mercatorXToLng(world.x);
		const lat = mercatorYToLat(world.y);
		west = Math.min(west, lng);
		south = Math.min(south, lat);
		east = Math.max(east, lng);
		north = Math.max(north, lat);
	});

	const bounds: [number, number, number, number] = [
		west,
		south,
		east,
		north
	];
	return {
		bounds,
		xyzImageTile: findCenterTile(bounds),
		scaleMultiplier,
		localMaxDimension,
		hasSkinnedMesh
	};
};
