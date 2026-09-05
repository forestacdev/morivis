import type { VRM } from '@pixiv/three-vrm';
import type * as THREE from 'three';
import type { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { type GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let vrmModulePromise: Promise<typeof import('@pixiv/three-vrm')> | null = null;

const loadVrmModule = async () => {
	if (!vrmModulePromise) {
		vrmModulePromise = import('@pixiv/three-vrm');
	}
	return vrmModulePromise;
};

/** VRM 固有の MToon・ヒューマノイド・揺れ物を登録した GLTFLoader を作る。 */
export const createVrmLoader = async (
	dracoLoader: DRACOLoader,
	manager?: THREE.LoadingManager
) => {
	const { VRMLoaderPlugin } = await loadVrmModule();
	const loader = new GLTFLoader(manager);
	loader.setDRACOLoader(dracoLoader);
	loader.register((parser) => new VRMLoaderPlugin(parser));
	return loader;
};

/** VRM 0.x はVRM 1.0と正面軸が逆のため、公式ユーティリティで向きをそろえる。 */
export const rotateVrm0IfNeeded = async (vrm: VRM) => {
	const { VRMUtils } = await loadVrmModule();
	VRMUtils.rotateVRM0(vrm);
};

export const getVrmFromGltf = (gltf: GLTF): VRM => {
	const vrm = (gltf.userData as { vrm?: VRM; }).vrm;
	if (!vrm) {
		throw new Error(
			'VRMとして認識できませんでした。VRoid Studioから .vrm 形式でエクスポートしてください。'
		);
	}
	return vrm;
};
