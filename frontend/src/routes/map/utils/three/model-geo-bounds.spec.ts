import type { GaussianSplatStyle } from '$routes/map/data/types/model';
import { getModelGeoBoundsFromLocalBounds } from '$routes/map/utils/three/model-geo-bounds';
import { describe, expect, it } from 'vitest';

const style: GaussianSplatStyle = {
	type: 'gaussian-splat',
	opacity: 1,
	splatScale: 1,
	transform: {
		lng: 0,
		lat: 0,
		altitude: 0,
		scale: 1,
		rotationX: 0,
		rotationY: 0,
		rotationZ: 0
	}
};

describe('getModelGeoBoundsFromLocalBounds', () => {
	it('ローカル範囲をモデル変換後の地理座標範囲へ変換する', () => {
		const bounds = getModelGeoBoundsFromLocalBounds([-5, 0, -10, 5, 10, 10], style);

		expect(bounds[0]).toBeCloseTo(-0.0000449158, 8);
		expect(bounds[1]).toBeCloseTo(-0.0000898315, 8);
		expect(bounds[2]).toBeCloseTo(0.0000449158, 8);
		expect(bounds[3]).toBeCloseTo(0.0000898315, 8);
	});
});
