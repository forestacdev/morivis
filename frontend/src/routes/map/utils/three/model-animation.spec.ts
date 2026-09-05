import { describe, expect, it } from 'vitest';

import { getInitialModelAnimationState, isVmdModelAnimationClip } from './model-animation';

describe('model animation presets', () => {
	it('returns the configured default state for an animation preset', () => {
		const state = getInitialModelAnimationState({
			clips: [
				{ name: 'idle', type: 'embedded' },
				{ name: 'motion-a', type: 'vmd', url: 'blob:motion-a' }
			],
			defaultClipIndex: 1,
			autoPlay: true,
			defaultSpeed: 1.25
		});

		expect(state).toEqual({
			currentClipIndex: 1,
			playing: true,
			speed: 1.25
		});
	});

	it('clamps the configured clip and speed to playable values', () => {
		const state = getInitialModelAnimationState({
			clips: [{ name: 'motion-a', type: 'vmd', url: 'blob:motion-a' }],
			defaultClipIndex: 100,
			defaultSpeed: -1
		});

		expect(state).toEqual({
			currentClipIndex: 0,
			playing: false,
			speed: 0
		});
	});

	it('identifies VMD presets by their explicit source type', () => {
		expect(isVmdModelAnimationClip({ name: 'motion-a', type: 'vmd', url: 'blob:motion-a' })).toBe(
			true
		);
		expect(isVmdModelAnimationClip({ name: 'idle', type: 'embedded' })).toBe(false);
	});
});
