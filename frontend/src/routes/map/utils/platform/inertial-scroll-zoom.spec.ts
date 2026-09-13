import { describe, expect, it } from 'vitest';
import { getScrollZoomDelta, getScrollZoomTarget, scrollZoomEasing } from './inertial-scroll-zoom';

const wheel = { deltaY: -120, deltaMode: 0, shiftKey: false, ctrlKey: false };

describe('慣性付きスクロールズーム', () => {
	it('入力後も動き続け、同じ時間幅での移動量が徐々に小さくなる', () => {
		const positions = [0, 0.2, 0.4, 0.6, 0.8, 1].map(scrollZoomEasing);
		expect(positions[0]).toBe(0);
		expect(positions.at(-1)).toBe(1);
		const steps = positions.slice(1).map((value, i) => value - positions[i]);
		for (let i = 1; i < steps.length; i++) {
			expect(steps[i]).toBeGreaterThan(0);
			expect(steps[i]).toBeLessThan(steps[i - 1]);
		}
	});

	it('連続入力では残りのズーム量に加算し、逆入力ではすぐ反転する', () => {
		expect(getScrollZoomTarget(10, 10.3, 0.2, 0, 25)).toBeCloseTo(10.5);
		expect(getScrollZoomTarget(10, 10.3, -0.2, 0, 25)).toBeCloseTo(9.8);
	});

	it('ズーム限界と過剰な慣性を制限する', () => {
		expect(getScrollZoomTarget(24.9, 25, 0.5, 0, 25)).toBe(25);
		expect(getScrollZoomTarget(0.1, 0, -0.5, 0, 25)).toBe(0);
		expect(getScrollZoomTarget(10, 11, 100, 0, 25)).toBe(11.5);
	});

	it('高ズームとShiftキーで微調整できる', () => {
		const normal = getScrollZoomDelta(wheel, 10, 600);
		expect(getScrollZoomDelta(wheel, 23, 600)).toBeLessThan(normal);
		expect(getScrollZoomDelta(wheel, 25, 600)).toBeLessThan(getScrollZoomDelta(wheel, 23, 600));
		expect(getScrollZoomDelta({ ...wheel, shiftKey: true }, 10, 600)).toBeLessThan(normal);
	});

	it('行・ページ単位のホイール入力をピクセル相当へ換算する', () => {
		expect(getScrollZoomDelta({ ...wheel, deltaY: -3, deltaMode: 1 }, 10, 600))
			.toBe(getScrollZoomDelta(wheel, 10, 600));
		expect(getScrollZoomDelta({ ...wheel, deltaY: -0.2, deltaMode: 2 }, 10, 600))
			.toBe(getScrollZoomDelta(wheel, 10, 600));
	});

	it('ゼロ・不正入力は無視し、大きな入力でも一度に1ズームを超えない', () => {
		for (const deltaY of [0, NaN, Infinity]) {
			expect(getScrollZoomDelta({ ...wheel, deltaY }, 10, 600)).toBe(0);
		}
		expect(Math.abs(getScrollZoomDelta({ ...wheel, deltaY: 100000 }, 10, 600)))
			.toBeLessThanOrEqual(1);
	});
});
