import type { VRM } from '@pixiv/three-vrm';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';
import type * as THREE from 'three';
import type { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { type GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let vrmModulePromise: Promise<typeof import('@pixiv/three-vrm')> | null = null;
let vrmAnimationModulePromise: Promise<typeof import('@pixiv/three-vrm-animation')> | null = null;

const loadVrmModule = async () => {
	if (!vrmModulePromise) {
		vrmModulePromise = import('@pixiv/three-vrm');
	}
	return vrmModulePromise;
};

const loadVrmAnimationModule = async () => {
	if (!vrmAnimationModulePromise) {
		vrmAnimationModulePromise = import('@pixiv/three-vrm-animation');
	}
	return vrmAnimationModulePromise;
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

/** VRM Animation 拡張を登録した GLTFLoader を作る。 */
export const createVrmAnimationLoader = async (manager?: THREE.LoadingManager) => {
	const { VRMAnimationLoaderPlugin } = await loadVrmAnimationModule();
	const loader = new GLTFLoader(manager);
	loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
	return loader;
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

export const getVrmAnimationFromGltf = (gltf: GLTF): VRMAnimation => {
	const animation = (gltf.userData as { vrmAnimations?: VRMAnimation[]; }).vrmAnimations?.[0];
	if (!animation) {
		throw new Error(
			'VRMAとして認識できませんでした。有効な .vrma ファイルを選択してください。'
		);
	}
	return animation;
};

/** .vrma をVRMのHumanoidボーン用の Three.js AnimationClip に変換する。 */
export const loadVrmAnimationClip = async (
	url: string,
	vrm: VRM,
	manager?: THREE.LoadingManager
) => {
	const [loader, { createVRMAnimationClip }] = await Promise.all([
		createVrmAnimationLoader(manager),
		loadVrmAnimationModule()
	]);
	const gltf = await loader.loadAsync(url);
	return createVRMAnimationClip(getVrmAnimationFromGltf(gltf), vrm);
};
