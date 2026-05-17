import maplibregl from 'maplibre-gl';
import type { MeshStyle } from '$routes/map/data/types/model';
import { mapStore } from '$routes/stores/map';

export interface ModelTransform {
	translateX: number;
	translateY: number;
	translateZ: number;
	rotateX: number;
	rotateY: number;
	rotateZ: number;
	scaleX: number;
	scaleY: number;
	scaleZ: number;
}

/** MeshStyle の transform から MapLibre 用の変換行列パラメータを計算 */
export const calculateModelTransform = (style: MeshStyle): ModelTransform => {
	const {
		lng,
		lat,
		altitude,
		heightOffset,
		heightScale,
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
	const baseScale = mc.meterInMercatorCoordinateUnits();

	return {
		translateX: mc.x,
		translateY: mc.y,
		translateZ: mc.z,
		rotateX: Math.PI / 2 + ((baseRotationX ?? 0) + rotationX) * (Math.PI / 180),
		rotateY: ((baseRotationY ?? 0) + rotationY) * (Math.PI / 180),
		rotateZ: ((baseRotationZ ?? 0) + rotationZ) * (Math.PI / 180),
		scaleX: baseScale * scale,
		scaleY: baseScale * scale * (heightScale ?? 1),
		scaleZ: baseScale * scale
	};
};
