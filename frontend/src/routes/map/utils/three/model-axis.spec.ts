import { describe, expect, it } from 'vitest';

import { applyProjectedModelAxisOverride, getModelBaseRotationX } from './model-axis';

describe('getModelBaseRotationX', () => {
	it('ローカルFBXではCAD向けの軸回転を適用しない', () => {
		expect(getModelBaseRotationX('fbx', true)).toBe(-180);
	});

	it('投影座標を持つFBXはCAD向けの軸回転を維持する', () => {
		expect(getModelBaseRotationX('fbx')).toBe(90);
	});
});

describe('applyProjectedModelAxisOverride', () => {
	it('投影座標系を持つ OBJ は FBX と同じ軸補正に合わせる', () => {
		const transform = {
			lng: 0,
			lat: 0,
			altitude: 0,
			heightOffset: 0,
			heightScale: 1,
			baseScale: 1,
			baseRotationX: -180,
			baseRotationY: 0,
			baseRotationZ: 0,
			scale: 1,
			rotationX: 0,
			rotationY: 0,
			rotationZ: 0
		};

		applyProjectedModelAxisOverride(transform, 'obj', '6677');

		expect(transform.baseRotationX).toBe(90);
	});

	it('座標系を持たない OBJ は既存の軸補正を変えない', () => {
		const transform = {
			lng: 0,
			lat: 0,
			altitude: 0,
			heightOffset: 0,
			heightScale: 1,
			baseScale: 1,
			baseRotationX: -180,
			baseRotationY: 0,
			baseRotationZ: 0,
			scale: 1,
			rotationX: 0,
			rotationY: 0,
			rotationZ: 0
		};

		applyProjectedModelAxisOverride(transform, 'obj');

		expect(transform.baseRotationX).toBe(-180);
	});
});
