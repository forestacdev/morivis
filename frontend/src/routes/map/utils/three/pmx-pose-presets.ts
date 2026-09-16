import type { ModelAnimationProperties, VpdModelAnimationClip } from '$routes/map/data/types/model';
import { resolveStaticAssetPath } from '$routes/map/utils/platform/asset-path';

const poseVariations = [
	{ prefix: '', label: '共通' },
	{ prefix: 'male-', label: '男性' },
	{ prefix: 'female-', label: '女性' }
];
const basicPoses = [
	{ file: 'standing', label: '立つ' },
	{ file: 'sitting', label: '座る（椅子）' },
	{ file: 'lying', label: '寝る（仰向け）' }
];

export const getDefaultPmxPoseClips = (): VpdModelAnimationClip[] =>
	poseVariations.flatMap((variant) =>
		basicPoses.map((pose) => ({
			name: `${variant.label}：${pose.label}`,
			type: 'vpd' as const,
			url: resolveStaticAssetPath(`/poses/pmx/${variant.prefix}${pose.file}.vpd`),
			ik: false
		}))
	);

/** 既存のクリップ順序・選択位置を維持したまま、足りない基本ポーズだけ追加する。 */
export const withDefaultPmxPoses = (
	animation?: ModelAnimationProperties
): ModelAnimationProperties => {
	const clips = animation?.clips ?? [];
	const missing = getDefaultPmxPoseClips().filter((preset) =>
		!clips.some((clip) => clip.type === 'vpd' && clip.url === preset.url)
	);
	if (animation && missing.length === 0) return animation;
	return {
		...animation,
		clips: [...clips, ...missing],
		defaultClipIndex: animation?.defaultClipIndex ?? (clips.length > 0 ? 0 : -1),
		autoPlay: animation?.autoPlay ?? false
	};
};
