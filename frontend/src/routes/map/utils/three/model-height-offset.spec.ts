import { describe, expect, it } from 'vitest';
import { getModelHeightOffsetSliderRange } from './model-height-offset';

const localBounds: [number, number, number, number, number, number] = [0, 0, 0, 10, 4, 6];

describe('model height offset slider', () => {
	it('scales its range and precision using both scaleUnit and the source unit scale', () => {
		const small = getModelHeightOffsetSliderRange({
			localBounds,
			transform: { scale: 2, scaleUnit: -2, baseScale: 0.1 }
		});
		const large = getModelHeightOffsetSliderRange({
			localBounds,
			transform: { scale: 2, scaleUnit: 1, baseScale: 0.1 }
		});
		expect(small.max).toBeCloseTo(0.02);
		expect(large.max).toBe(20);
		expect(small.step).toBeLessThan(large.step);
		expect(small.fractionDigits).toBeGreaterThan(2);
	});

	it('preserves offsets outside the model size after reducing the scale', () => {
		for (const heightOffset of [-123.45, 123.45]) {
			const range = getModelHeightOffsetSliderRange({
				localBounds,
				transform: { scale: 0.01 },
				heightOffset
			});
			expect(range.min).toBeLessThanOrEqual(heightOffset);
			expect(range.max).toBeGreaterThanOrEqual(heightOffset);
			expect(range.step).toBeLessThan(0.01);
		}
	});

	it('includes vertical exaggeration when it becomes the largest dimension', () => {
		const range = getModelHeightOffsetSliderRange({
			localBounds,
			transform: { scale: 1, heightScale: 10 }
		});
		expect(range.max).toBe(50);
	});

	it('uses a scalable fallback for models without local bounds', () => {
		expect(getModelHeightOffsetSliderRange({ transform: { scale: 1 } }).max).toBe(100);
		expect(getModelHeightOffsetSliderRange({ transform: { scale: 0.1 } }).max).toBe(10);
	});

	it('keeps the slider usable for empty or invalid dimensions and zero scale', () => {
		for (const scale of [0, NaN, Infinity]) {
			const range = getModelHeightOffsetSliderRange({
				localBounds: [0, 0, 0, 0, 0, 0],
				transform: { scale }
			});
			expect(Number.isFinite(range.max)).toBe(true);
			expect(range.max).toBeGreaterThan(range.min);
			expect(range.step).toBeGreaterThan(0);
		}
	});
});
