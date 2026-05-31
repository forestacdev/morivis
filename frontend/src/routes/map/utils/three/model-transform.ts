import maplibregl from 'maplibre-gl';
import * as THREE from 'three';
import type { MeshStyle } from '$routes/map/data/types/model';
import { mapStore } from '$routes/stores/map';

export interface ModelTransform {
	modelOrigin: [number, number];
	modelAltitude: number;
	rotateX: number;
	rotateY: number;
	rotateZ: number;
	scaleX: number;
	scaleY: number;
	scaleZ: number;
}

/** MeshStyle の transform から描画用のローカル変換パラメータを計算 */
export const calculateModelTransform = (style: MeshStyle): ModelTransform => {
	const {
		lng,
		lat,
		altitude,
		heightOffset,
		heightScale,
		baseScale,
		baseRotationX,
		baseRotationY,
		baseRotationZ,
		scale,
		rotationX,
		rotationY,
		rotationZ
	} = style.transform;

	const effectiveAltitude = (mapStore.getTerrain() ? altitude : 0) + (heightOffset ?? 0);

	return {
		modelOrigin: [lng, lat],
		modelAltitude: effectiveAltitude,
		rotateX: ((baseRotationX ?? 0) + rotationX) * (Math.PI / 180),
		rotateY: ((baseRotationY ?? 0) + rotationY) * (Math.PI / 180),
		rotateZ: ((baseRotationZ ?? 0) + rotationZ) * (Math.PI / 180),
		scaleX: (baseScale ?? 1) * scale,
		scaleY: (baseScale ?? 1) * scale * (heightScale ?? 1),
		scaleZ: (baseScale ?? 1) * scale
	};
};

/** 境界計算用に、メルカトル座標系でのモデル行列を生成する */
export const createMercatorModelMatrix = (style: MeshStyle): THREE.Matrix4 => {
	const {
		lng,
		lat,
		altitude,
		heightOffset,
		heightScale,
		baseScale,
		baseRotationX,
		baseRotationY,
		baseRotationZ,
		scale,
		rotationX,
		rotationY,
		rotationZ
	} = style.transform;

	const effectiveAltitude = (mapStore.getTerrain() ? altitude : 0) + (heightOffset ?? 0);
	const mc = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], effectiveAltitude);
	const mercatorScale = mc.meterInMercatorCoordinateUnits();
	const rotationXMatrix = new THREE.Matrix4().makeRotationAxis(
		new THREE.Vector3(1, 0, 0),
		((baseRotationX ?? 0) + rotationX) * (Math.PI / 180)
	);
	const rotationYMatrix = new THREE.Matrix4().makeRotationAxis(
		new THREE.Vector3(0, 1, 0),
		((baseRotationY ?? 0) + rotationY) * (Math.PI / 180)
	);
	const rotationZMatrix = new THREE.Matrix4().makeRotationAxis(
		new THREE.Vector3(0, 0, 1),
		((baseRotationZ ?? 0) + rotationZ) * (Math.PI / 180)
	);
	const scaleMatrix = new THREE.Matrix4().makeScale(
		mercatorScale * (baseScale ?? 1) * scale,
		-mercatorScale * (baseScale ?? 1) * scale * (heightScale ?? 1),
		-mercatorScale * (baseScale ?? 1) * scale
	);

	return new THREE.Matrix4()
		.makeTranslation(mc.x, mc.y, mc.z)
		.multiply(rotationXMatrix)
		.multiply(rotationYMatrix)
		.multiply(rotationZMatrix)
		.multiply(scaleMatrix);
};
