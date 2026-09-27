import { describe, expect, it } from 'vitest';

import { getAllowedTransformModesForIssue, getModelSpatialIssue } from './transform-policy';

it.each(['ascii-grid', 'envi-bil'] as const)(
	'%sは座標系を選択でき、手動の位置合わせも使える',
	format => {
		expect(getAllowedTransformModesForIssue(format, 'crs-missing')).toEqual(['zone']);
		expect(getAllowedTransformModesForIssue(format, 'placement-missing')).toEqual(['georef']);
	}
);

it.each(['jww', 'cedxm'] as const)('%sは座標系の指定と地図上の位置合わせを選べる', format => {
	expect(getAllowedTransformModesForIssue(format, 'crs-missing')).toEqual(['zone', 'georef']);
});

it('Excelの図面は位置合わせへ、表の座標は座標系選択または位置合わせへ進む', () => {
	expect(getAllowedTransformModesForIssue('xlsx', 'placement-missing')).toEqual(['georef']);
	expect(getAllowedTransformModesForIssue('xlsx', 'crs-missing')).toEqual(['zone', 'georef']);
});

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

it.each(['pptx', 'docx'] as const)('%sの図面は位置合わせで登録する', (format) => {
	expect(getAllowedTransformModesForIssue(format, 'placement-missing')).toEqual(['georef']);
	expect(getAllowedTransformModesForIssue(format, 'crs-missing')).toEqual([]);
});
