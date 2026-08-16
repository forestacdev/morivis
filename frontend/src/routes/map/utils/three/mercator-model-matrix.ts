import type { MeshStyle } from '$routes/map/data/types/model';
import * as THREE from 'three';

const EARTH_CIRCUMFERENCE = 40075016.68557849;

const lngToMercatorX = (lng: number) => (lng + 180) / 360;

const latToMercatorY = (lat: number) =>
	(180
		- (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + THREE.MathUtils.degToRad(lat) / 2)))
	/ 360;

const meterInMercatorCoordinateUnits = (lat: number) =>
	1 / (EARTH_CIRCUMFERENCE * Math.cos(THREE.MathUtils.degToRad(lat)));

const buildMercatorAnchorMatrix = (
	lng: number,
	lat: number,
	altitude: number
): THREE.Matrix4 => {
	const mercatorScale = meterInMercatorCoordinateUnits(lat);
	const mercatorX = lngToMercatorX(lng);
	const mercatorY = latToMercatorY(lat);
	const mercatorZ = altitude * mercatorScale;
	const mapLibreBaseRotationZ = new THREE.Matrix4().makeRotationZ(Math.PI);
	const mapLibreBaseRotationX = new THREE.Matrix4().makeRotationX(Math.PI / 2);
	const mapLibreBaseScale = new THREE.Matrix4().makeScale(
		-mercatorScale,
		mercatorScale,
		mercatorScale
	);

	return new THREE.Matrix4()
		.makeTranslation(mercatorX, mercatorY, mercatorZ)
		.multiply(mapLibreBaseRotationZ)
		.multiply(mapLibreBaseRotationX)
		.multiply(mapLibreBaseScale);
};

export const buildMercatorModelMatrix = (
	transform: MeshStyle['transform'],
	terrainEnabled: boolean
): THREE.Matrix4 => {
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
	} = transform;

	const effectiveAltitude = (terrainEnabled ? altitude : 0) + (heightOffset ?? 0);
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
		(baseScale ?? 1) * scale,
		-(baseScale ?? 1) * scale * (heightScale ?? 1),
		-(baseScale ?? 1) * scale
	);

	return buildMercatorAnchorMatrix(lng, lat, effectiveAltitude)
		.multiply(rotationXMatrix)
		.multiply(rotationYMatrix)
		.multiply(rotationZMatrix)
		.multiply(scaleMatrix);
};
