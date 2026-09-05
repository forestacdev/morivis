import { describe, expect, it } from 'vitest';

import {
	getAllowedTransformModesForIssue,
	getModelSpatialIssue
} from './transform-policy';

describe('3Dモデルの座標処理ポリシー', () => {
	it('内蔵EPSGまたは明示配置があるモデルは操作を要求しない', () => {
		expect(
			getModelSpatialIssue({
				hasEmbeddedEpsg: true,
				hasExplicitPlacement: false,
				coordinateMode: 'projected'
			})
		).toBe('resolved');
		expect(
			getModelSpatialIssue({
				hasEmbeddedEpsg: false,
				hasExplicitPlacement: true,
				coordinateMode: 'local'
			})
		).toBe('resolved');
	});

	it('平面直角座標候補は座標系選択、ローカル原点は位置合わせに分岐する', () => {
		expect(
			getModelSpatialIssue({
				hasEmbeddedEpsg: false,
				hasExplicitPlacement: false,
				coordinateMode: 'projected'
			})
		).toBe('crs-missing');
		expect(
			getModelSpatialIssue({
				hasEmbeddedEpsg: false,
				hasExplicitPlacement: false,
				coordinateMode: 'local'
			})
		).toBe('placement-missing');
		expect(getAllowedTransformModesForIssue('model', 'placement-missing')).toEqual(['georef']);
	});
});
