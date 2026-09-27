import { describe, expect, it } from 'vitest';
import type { DMFeature } from '.';
import { innerRing, outerRing } from './__fixtures__/records';
import { attachCourtyardHoles } from './courtyard';

const feature = (
	ring: number[][],
	figureType = 0,
	drawingId = 'test-drawing',
	classCode = '3001'
): DMFeature => ({
	type: 'Feature',
	geometry: { type: 'Polygon', coordinates: [ring] },
	properties: {
		classCode,
		className: 'test-building',
		dataType: '面',
		dataTypeCode: '1',
		elementId: 1,
		layer: '3000',
		mapLevel: 1000,
		drawingId,
		figureType
	}
});

describe('DM建物の中庭', () => {
	it('入力順に依存せず複数の中庭を穴にし、入力を変更しない', () => {
		const outer = feature(outerRing);
		const holes = [
			feature(innerRing, 31),
			feature(innerRing.map(([x, y]) => [x + 400, y + 400]), 31)
		];
		const result = attachCourtyardHoles([...holes, outer]);
		expect(result).toHaveLength(1);
		expect(result[0].geometry.coordinates).toHaveLength(3);
		expect(outer.geometry.coordinates).toHaveLength(1);
	});
	it('図郭が異なる建物には組み込まない', () => {
		expect(attachCourtyardHoles([feature(outerRing), feature(innerRing, 31, 'test-other')]))
			.toHaveLength(2);
	});
	it('中庭指定のない内側ポリゴンを削除しない', () => {
		expect(attachCourtyardHoles([feature(outerRing), feature(innerRing)])).toHaveLength(2);
	});
	it('境界に接触する、または外へはみ出す中庭を残す', () => {
		for (const shift of [-200, -300]) {
			expect(
				attachCourtyardHoles([
					feature(outerRing),
					feature(innerRing.map(([x, y]) => [x + shift, y]), 31)
				])
			).toHaveLength(2);
		}
	});
	it('頂点は内側でも辺が凹部を横切る中庭を残す', () => {
		const concave = [[0, 0], [10, 0], [10, 10], [6, 10], [6, 4], [4, 4], [4, 10], [0, 10], [
			0,
			0
		]];
		const crossing = [[2, 2], [8, 2], [8, 8], [2, 8], [2, 2]];
		expect(attachCourtyardHoles([feature(concave), feature(crossing, 31)])).toHaveLength(2);
	});
	it('複数建物に含まれる場合は最小の外周に一度だけ割り当てる', () => {
		const large = feature(outerRing.map(([x, y]) => [x * 2 - 100, y * 2 - 100]));
		const result = attachCourtyardHoles([large, feature(outerRing), feature(innerRing, 31)]);
		expect(result.map(item => item.geometry.coordinates.length)).toEqual([1, 2]);
	});
	it('建物以外の図形区分31は穴にしない', () => {
		expect(
			attachCourtyardHoles([
				feature(outerRing),
				feature(innerRing, 31, 'test-drawing', '1101')
			])
		).toHaveLength(2);
	});
});
