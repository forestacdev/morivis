import type { VmdModelAnimationClip, VpdModelAnimationClip } from '$routes/map/data/types/model';
import type {
	ModelSource,
	TextureMap,
	ThreeMmdAnimation,
	ThreeMmdLoader,
	ThreeMmdModel
} from '@yohawing/three-mmd-loader/three';
import type * as THREE from 'three';

let pmxLoaderModulePromise: Promise<typeof import('@yohawing/three-mmd-loader/three')> | null =
	null;

const loadPmxLoaderModule = async () => {
	if (!pmxLoaderModulePromise) {
		pmxLoaderModulePromise = import('@yohawing/three-mmd-loader/three');
	}
	return pmxLoaderModulePromise;
};

export interface LoadedPmxModel {
	loader: ThreeMmdLoader;
	model: ThreeMmdModel;
}

/** PMX の輪郭・モーフ分割は生成せず、表情に必要なモーフ属性は保持する。 */
export const loadPmxModel = async (
	source: ModelSource,
	resourceUrls?: Record<string, string>
): Promise<LoadedPmxModel> => {
	const { ThreeMmdLoader } = await loadPmxLoaderModule();
	const loader = new ThreeMmdLoader({
		...(resourceUrls && { textureMap: resourceUrls as TextureMap })
	});
	// blob/data URL には相対パスの基点がない。バイナリとして渡すことで、
	// 未添付のテクスチャをローダーが URL 解決しようとして失敗するのを防ぐ。
	let modelSource = source;
	if (typeof source === 'string' && /^(blob|data):/i.test(source)) {
		const response = await fetch(source);
		if (!response.ok) throw new Error(`PMXを取得できません: ${response.status}`);
		modelSource = await response.arrayBuffer();
	}
	const model = await loader.loadModel(modelSource, {
		outline: false,
		materialRenderOrder: false,
		morphSplit: false,
		morphAttributes: true
	});
	return { loader, model };
};

export const loadPmxObject = async (
	source: ModelSource,
	resourceUrls?: Record<string, string>
): Promise<THREE.Group> => (await loadPmxModel(source, resourceUrls)).model.root;

/** VPD は 0 フレームのアニメーションとして既存の MMD ランタイムへ渡す。 */
export const loadPmxAnimationClip = (
	loader: ThreeMmdLoader,
	clip: VmdModelAnimationClip | VpdModelAnimationClip
): Promise<ThreeMmdAnimation> =>
	clip.type === 'vpd'
		? loader.loadPoseAnimation(clip.url, clip.name)
		: loader.loadAnimation(clip.url);

export const applyPmxAnimationClip = (
	model: Pick<ThreeMmdModel, 'setAnimation' | 'update' | 'runtime'>,
	animation: ThreeMmdAnimation,
	isPose: boolean,
	ik = true
) => {
	// VPD 用ランタイムの再生成前に戻し、前のポーズが累積するのを防ぐ。
	model.runtime.resetPose();
	model.setAnimation(animation);
	// 静止ポーズも停止中のモーションも、選択直後に一度だけ描画姿勢を更新する。
	model.update(0, isPose ? { physics: false, ik } : undefined);
};

/** 適用中のモーション・ポーズを解除し、モデル本来の姿勢を描画へ反映する。 */
export const clearPmxAnimationClip = (
	model: Pick<ThreeMmdModel, 'runtime' | 'update'> & Partial<Pick<ThreeMmdModel, 'mesh'>>
) => {
	model.runtime.clearAnimation();
	model.runtime.resetPose();
	model.update(0, { physics: false, ik: false });
	// JSランタイムのresetPoseは骨だけを戻すため、表情も明示的に解除する。
	model.mesh?.morphTargetInfluences?.fill(0);
};
