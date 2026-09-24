import { WGS84_ELLIPSOID } from '3d-tiles-renderer/three';
import { Matrix4, PerspectiveCamera, Vector3 } from 'three';

const EARTH_CIRCUMFERENCE = 40075016.68557849;

/** ECEFをタイルセット付近のENUへ移し、大きな地心座標をGPUに渡さない。 */
export const createTilesCoordinateFrame = (center: Vector3) => {
	const { lat, lon, height } = WGS84_ELLIPSOID.getPositionToCartographic(center, {});
	const scale = 1 / (EARTH_CIRCUMFERENCE * Math.cos(lat));
	const ecefToLocal = WGS84_ELLIPSOID.getEastNorthUpFrame(lat, lon, height, new Matrix4())
		.invert();
	const anchor = new Matrix4().makeTranslation(
		(lon + Math.PI) / (2 * Math.PI),
		(1 - Math.log(Math.tan(Math.PI / 4 + lat / 2)) / Math.PI) / 2,
		height * scale
	).scale(new Vector3(scale, -scale, scale));
	return { ecefToLocal, anchor, scale };
};

export const withTilesHeightOffset = (anchor: Matrix4, scale: number, offset: number) => {
	const result = anchor.clone();
	result.elements[14] += (Number.isFinite(offset) ? offset : 0) * scale;
	return result;
};

/** 描画とLOD判定で同じ投影・視点を使う。MapLibreの行列はprojection * view。 */
export const syncTilesCamera = (
	camera: PerspectiveCamera,
	mapMatrix: Matrix4,
	projection: Matrix4,
	anchor: Matrix4
) => {
	camera.matrixAutoUpdate = false;
	camera.matrixWorldAutoUpdate = false;
	camera.projectionMatrix.copy(projection);
	camera.projectionMatrixInverse.copy(projection).invert();
	camera.matrixWorldInverse.copy(camera.projectionMatrixInverse).multiply(mapMatrix).multiply(
		anchor
	);
	camera.matrixWorld.copy(camera.matrixWorldInverse).invert();
	camera.position.setFromMatrixPosition(camera.matrixWorld);
};
