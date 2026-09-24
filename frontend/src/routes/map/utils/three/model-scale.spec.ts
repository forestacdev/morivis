import {
	getEffectiveModelScale,
	getModelUnitMeters,
	normalizeModelScale,
	normalizeModelTransformScale,
	normalizeModelUnitMeters
} from '$routes/map/utils/three/model-scale';
import { describe, expect, it } from 'vitest';

describe('model scale', () => {
	it.each([0.1, 0.25, 1, 10, 250])('1ブロック=%smを固定倍率込みで往復できる', (meters) => {
		for (const baseScale of [1, 0.001, 200]) {
			const scale = normalizeModelUnitMeters(meters, baseScale);
			expect(scale).not.toBeNull();
			expect(getModelUnitMeters({ ...scale!, baseScale })).toBeCloseTo(meters, 8);
		}
	});

	it('ドラッグで変化したscaleと10進指数をブロックの実寸に反映する', () => {
		expect(getModelUnitMeters({ scale: 2.5, scaleUnit: -1, baseScale: 2 })).toBe(0.5);
		expect(getModelUnitMeters({ scale: 5, scaleUnit: -1, baseScale: 2 })).toBe(1);
	});

	it.each([0, -1, Number.NaN, Infinity, -Infinity, Number.MIN_VALUE])(
		'無効または表現不能な長さ%sを拒否する',
		(meters) => {
			expect(normalizeModelUnitMeters(meters)).toBeNull();
		}
	);

	it('無効な固定倍率と、換算時のオーバーフロー・アンダーフローを拒否する', () => {
		for (const baseScale of [0, -1, Number.NaN, Infinity]) {
			expect(normalizeModelUnitMeters(1, baseScale)).toBeNull();
		}
		expect(normalizeModelUnitMeters(Number.MAX_VALUE, 0.001)).toBeNull();
		expect(normalizeModelUnitMeters(Number.MIN_VALUE, 10)).toBeNull();
	});

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
