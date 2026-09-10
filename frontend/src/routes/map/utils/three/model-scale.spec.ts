import {
	getEffectiveModelScale,
	normalizeModelScale,
	normalizeModelTransformScale
} from '$routes/map/utils/three/model-scale';
import { describe, expect, it } from 'vitest';

describe('model scale', () => {
	it('scaleUnit 未指定の旧データは従来の倍率を維持する', () => {
		expect(getEffectiveModelScale({ scale: 600 })).toBe(600);
	});

	it('スライダー値と10進の桁から実倍率を求める', () => {
		expect(getEffectiveModelScale({ scale: 2.5, scaleUnit: -1 })).toBeCloseTo(0.25);
		expect(getEffectiveModelScale({ scale: 2.5, scaleUnit: 2 })).toBe(250);
	});

	it('実倍率を1以上10未満のスライダー値へ正規化する', () => {
		expect(normalizeModelScale(600)).toEqual({ scale: 6, scaleUnit: 2 });
		expect(normalizeModelScale(0.25)).toEqual({ scale: 2.5, scaleUnit: -1 });
		expect(normalizeModelTransformScale({ scale: 4, scaleUnit: 3 })).toEqual({
			scale: 4,
			scaleUnit: 3
		});
	});
});
