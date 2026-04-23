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
	scale: number;
}

/** MeshStyle の transform から MapLibre 用の変換行列パラメータを計算 */
export const calculateModelTransform = (style: MeshStyle): ModelTransform => {
	const { lng, lat, altitude, heightOffset, scale, rotationX, rotationY, rotationZ } =
		style.transform;

	const effectiveAltitude = (mapStore.getTerrain() ? altitude : 0) + heightOffset;
	const mc = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], effectiveAltitude);
	const baseScale = mc.meterInMercatorCoordinateUnits();

	return {
		translateX: mc.x,
		translateY: mc.y,
		translateZ: mc.z,
		rotateX: Math.PI / 2 + (rotationX * Math.PI) / 180,
		rotateY: (rotationY * Math.PI) / 180,
		rotateZ: (rotationZ * Math.PI) / 180,
		scale: baseScale * scale
	};
};
