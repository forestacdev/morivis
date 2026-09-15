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

/** PMX の輪郭・モーフ分割は表示コストが大きいため、通常のメッシュ表示では生成しない。 */
export const loadPmxModel = async (
	source: ModelSource,
	resourceUrls?: Record<string, string>
): Promise<LoadedPmxModel> => {
	const { ThreeMmdLoader } = await loadPmxLoaderModule();
	const loader = new ThreeMmdLoader({
		...(resourceUrls && { textureMap: resourceUrls as TextureMap })
	});
	const model = await loader.loadModel(source, {
		outline: false,
		materialRenderOrder: false,
		morphSplit: false,
		morphAttributes: false
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
	isPose: boolean
) => {
	// VPD 用ランタイムの再生成前に戻し、前のポーズが累積するのを防ぐ。
	model.runtime.resetPose();
	model.setAnimation(animation);
	// 静止ポーズも停止中のモーションも、選択直後に一度だけ描画姿勢を更新する。
	model.update(0, isPose ? { physics: false } : undefined);
};
