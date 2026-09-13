import type { MorivisLayerEntry } from '$routes/map/data/types';
import type { ModelLocalBounds, ModelTransformStyle } from '$routes/map/data/types/model';
import { buildMercatorModelMatrix } from '$routes/map/utils/three/mercator-model-matrix';
import { type CameraOptions, type Map, MercatorCoordinate } from 'maplibre-gl';
import { Box3, MathUtils, Sphere, Vector3 } from 'three';

interface ModelFocusViewport {
	width: number;
	height: number;
	fov: number;
	bearing: number;
	pitch: number;
	terrainEnabled: boolean;
	centerElevation: number;
}

/** 描画時と同じ変換を適用し、3D範囲を囲む球が画面の80%以内に収まる視点を求める。 */
export const getModelFocusView = (
	localBounds: ModelLocalBounds,
	style: ModelTransformStyle,
	viewport: ModelFocusViewport
) => {
	if (!localBounds.every(Number.isFinite)) return null;
	const { width, height, fov, bearing, pitch, terrainEnabled, centerElevation } = viewport;
	if (!(width > 0 && height > 0 && fov > 0 && fov < 180 && pitch >= 0 && pitch < 90)) {
		return null;
	}
	const box = new Box3(
		new Vector3(...localBounds.slice(0, 3)),
		new Vector3(...localBounds.slice(3, 6))
	);
	if (box.isEmpty()) return null;
	box.applyMatrix4(buildMercatorModelMatrix(style.transform, terrainEnabled));
	const { center, radius } = box.getBoundingSphere(new Sphere());
	if (!(radius > 0) || ![...center.toArray(), radius].every(Number.isFinite)) return null;

	const halfFov = Math.atan(
		Math.tan(MathUtils.degToRad(fov) / 2) * 0.8 * Math.min(1, width / height)
	);
	const distance = radius / Math.sin(halfFov);
	const pitchRadians = MathUtils.degToRad(pitch);
	const bearingRadians = MathUtils.degToRad(bearing);
	const backward = new Vector3(
		-Math.sin(bearingRadians) * Math.sin(pitchRadians),
		Math.cos(bearingRadians) * Math.sin(pitchRadians),
		Math.cos(pitchRadians)
	);
	const position = center.clone().addScaledVector(backward, distance);

	// 中心の地形追従を維持したまま、視線がモデルの3D中心を通る地図中心へ移す。
	const centerLngLat = new MercatorCoordinate(center.x, center.y, center.z).toLngLat();
	const groundZ = MercatorCoordinate.fromLngLat(centerLngLat, centerElevation).z;
	const target = center.clone().addScaledVector(backward, -(center.z - groundZ) / backward.z);
	if (position.z <= target.z || !target.toArray().every(Number.isFinite)) return null;
	return { position, target };
};

const toMercatorCoordinate = (point: Vector3) => new MercatorCoordinate(point.x, point.y, point.z);

/** 3D範囲がないモデルやdeck.gl系のentryは、既存の地理範囲によるフォーカスへ戻す。 */
export const getModelFocusCamera = (entry: MorivisLayerEntry, map: Map): CameraOptions | null => {
	if (
		entry.type !== 'model' || !('transform' in entry.style)
		|| !('localBounds' in entry.format) || !entry.format.localBounds
	) return null;

	const canvas = map.getCanvas();
	const terrainEnabled = Boolean(map.getTerrain());
	const getCenterElevation = (lngLat: { lng: number; lat: number; }) =>
		map.getCenterClampedToGround()
			? (terrainEnabled ? map.queryTerrainElevation(lngLat) ?? 0 : 0)
			: map.getCenterElevation();
	const viewport = {
		width: canvas.clientWidth,
		height: canvas.clientHeight,
		fov: map.getVerticalFieldOfView(),
		bearing: map.getBearing(),
		pitch: Math.min(map.getPitch(), 85),
		terrainEnabled,
		centerElevation: getCenterElevation(entry.style.transform)
	};
	let view = getModelFocusView(entry.format.localBounds, entry.style, viewport);
	if (!view) return null;
	// 高さ補正で地図中心が動くため、移動先の地形高でもう一度計算する。
	if (terrainEnabled) {
		viewport.centerElevation = getCenterElevation(toMercatorCoordinate(view.target).toLngLat());
		view = getModelFocusView(entry.format.localBounds, entry.style, viewport);
		if (!view) return null;
	}
	const position = toMercatorCoordinate(view.position);
	const target = toMercatorCoordinate(view.target);
	const camera = map.calculateCameraOptionsFromTo(
		position.toLngLat(),
		position.toAltitude(),
		target.toLngLat(),
		target.toAltitude()
	);
	return {
		...camera,
		zoom: Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), camera.zoom!))
	};
};
