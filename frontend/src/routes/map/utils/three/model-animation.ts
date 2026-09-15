import type {
	ModelAnimationClip,
	ModelAnimationProperties,
	ModelAnimationState,
	VmdModelAnimationClip,
	VpdModelAnimationClip,
	VrmaModelAnimationClip
} from '$routes/map/data/types/model';

export const isVmdModelAnimationClip = (
	clip: ModelAnimationProperties['clips'][number]
): clip is VmdModelAnimationClip => clip.type === 'vmd';

export const isVpdModelAnimationClip = (
	clip: ModelAnimationProperties['clips'][number] | undefined
): clip is VpdModelAnimationClip => clip?.type === 'vpd';

export const isVrmaModelAnimationClip = (
	clip: ModelAnimationProperties['clips'][number]
): clip is VrmaModelAnimationClip => clip.type === 'vrma';

export const isEmbeddedModelAnimationClip = (
	clip: ModelAnimationProperties['clips'][number] | undefined
): clip is ModelAnimationClip => !clip || clip.type === undefined || clip.type === 'embedded';

export const getInitialModelAnimationState = (
	properties: ModelAnimationProperties | undefined
): ModelAnimationState | undefined => {
	if (!properties || properties.clips.length === 0) return undefined;

	const currentClipIndex = properties.defaultClipIndex === -1 ? -1 : Math.min(
		Math.max(properties.defaultClipIndex ?? 0, 0),
		properties.clips.length - 1
	);

	return {
		currentClipIndex,
		playing: currentClipIndex !== -1
			&& !isVpdModelAnimationClip(properties.clips[currentClipIndex])
			&& (properties.autoPlay ?? false),
		speed: Math.max(properties.defaultSpeed ?? 1, 0),
		loop: properties.defaultLoop ?? true
	};
};
