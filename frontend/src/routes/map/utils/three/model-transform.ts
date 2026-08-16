import type { MeshStyle } from '$routes/map/data/types/model';
import { buildMercatorModelMatrix } from '$routes/map/utils/three/mercator-model-matrix';
import { mapStore } from '$routes/stores/map';
import * as THREE from 'three';

export interface ModelTransform {
	matrix: THREE.Matrix4;
}

/** MeshStyle の transform から描画用のモデル行列を計算 */
export const calculateModelTransform = (style: MeshStyle): ModelTransform => ({
	matrix: buildMercatorModelMatrix(style.transform, Boolean(mapStore.getTerrain()))
});

export const createMercatorModelMatrix = (style: MeshStyle): THREE.Matrix4 =>
	buildMercatorModelMatrix(style.transform, Boolean(mapStore.getTerrain()));
