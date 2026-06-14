import { describe, expect, it } from 'vitest';

import {
	applyAspectLockedGeoRefDrag,
	applyAspectLockedPlaneDrag,
	getGeoRefAspectRatio,
	measureMercatorAspectRatio
} from './aspect-locked';

const edgeLength = (a: [number, number], b: [number, number]) =>
	Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('applyAspectLockedGeoRefDrag', () => {
	it('SE を動かしても縦横比を保つ', () => {
		const corners: [[number, number], [number, number], [number, number], [number, number]] = [
			[0, 0],
			[4, 0],
			[4, 2],
			[0, 2]
		];

		const result = applyAspectLockedPlaneDrag(corners, 'se', [8, 4], 2);
		const width = edgeLength(result[0], result[1]);
		const height = edgeLength(result[0], result[3]);

		expect(result[0]).toEqual([0, 0]);
		expect(result[2]).toEqual([8, 4]);
		expect(width / height).toBeCloseTo(2, 6);
	});

	it('NE-SW 対角でも縦横比を保つ', () => {
		const corners: [[number, number], [number, number], [number, number], [number, number]] = [
			[0, 0],
			[4, 0],
			[4, 2],
			[0, 2]
		];

		const result = applyAspectLockedPlaneDrag(
			corners,
			'ne',
			[6, -1],
			getGeoRefAspectRatio(4, 2)
		);
		const width = edgeLength(result[0], result[1]);
		const height = edgeLength(result[0], result[3]);

		expect(result[3]).toEqual([0, 2]);
		expect(result[1]).toEqual([6, -1]);
		expect(width / height).toBeCloseTo(2, 6);
	});

	it('高緯度でもメルカトル平面上の縦横比を保つ', () => {
		const corners: [[number, number], [number, number], [number, number], [number, number]] = [
			[140, 60],
			[142, 60],
			[142, 61],
			[140, 61]
		];

		const result = applyAspectLockedGeoRefDrag(
			corners,
			'se',
			[143, 61.5],
			getGeoRefAspectRatio(4, 2)
		);

		expect(result[0][0]).toBeCloseTo(140, 6);
		expect(result[0][1]).toBeCloseTo(60, 6);
		expect(result[2][0]).toBeCloseTo(143, 6);
		expect(result[2][1]).toBeCloseTo(61.5, 6);
		expect(measureMercatorAspectRatio(result)).toBeCloseTo(2, 6);
	});
});
