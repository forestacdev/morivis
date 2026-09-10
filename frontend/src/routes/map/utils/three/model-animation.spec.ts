import { describe, expect, it } from 'vitest';

import {
	getInitialModelAnimationState,
	isVmdModelAnimationClip,
	isVrmaModelAnimationClip
} from './model-animation';

describe('model animation presets', () => {
	it('returns the configured default state for an animation preset', () => {
		const state = getInitialModelAnimationState({
			clips: [
				{ name: 'idle', type: 'embedded' },
				{ name: 'motion-a', type: 'vmd', url: 'blob:motion-a' }
			],
			defaultClipIndex: 1,
			autoPlay: true,
			defaultSpeed: 1.25,
			defaultLoop: false
		});

		expect(state).toEqual({
			currentClipIndex: 1,
			playing: true,
			speed: 1.25,
			loop: false
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
			speed: 0,
			loop: true
		});
	});

	it('identifies VMD presets by their explicit source type', () => {
		expect(isVmdModelAnimationClip({ name: 'motion-a', type: 'vmd', url: 'blob:motion-a' }))
			.toBe(true);
		expect(isVmdModelAnimationClip({ name: 'idle', type: 'embedded' })).toBe(false);
	});

	it('identifies VRMA presets by their explicit source type', () => {
		expect(isVrmaModelAnimationClip({ name: 'walk', type: 'vrma', url: 'blob:walk' })).toBe(
			true
		);
		expect(isVrmaModelAnimationClip({ name: 'motion-a', type: 'vmd', url: 'blob:motion-a' }))
			.toBe(false);
	});
});
