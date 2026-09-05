import type {
	ModelAnimationClip,
	ModelAnimationProperties,
	ModelAnimationState,
	VmdModelAnimationClip,
	VrmaModelAnimationClip
} from '$routes/map/data/types/model';

export const isVmdModelAnimationClip = (
	clip: ModelAnimationClip | VmdModelAnimationClip | VrmaModelAnimationClip
): clip is VmdModelAnimationClip => clip.type === 'vmd';

export const isVrmaModelAnimationClip = (
	clip: ModelAnimationClip | VmdModelAnimationClip | VrmaModelAnimationClip
): clip is VrmaModelAnimationClip => clip.type === 'vrma';

export const isEmbeddedModelAnimationClip = (
	clip: ModelAnimationClip | VmdModelAnimationClip | VrmaModelAnimationClip | undefined
): clip is ModelAnimationClip => !clip || clip.type === undefined || clip.type === 'embedded';

export const getInitialModelAnimationState = (
	properties: ModelAnimationProperties | undefined
): ModelAnimationState | undefined => {
	if (!properties || properties.clips.length === 0) return undefined;

	const currentClipIndex = Math.min(
		Math.max(properties.defaultClipIndex ?? 0, 0),
		properties.clips.length - 1
	);

	return {
		currentClipIndex,
		playing: properties.autoPlay ?? false,
		speed: Math.max(properties.defaultSpeed ?? 1, 0),
		loop: properties.defaultLoop ?? true
	};
};
