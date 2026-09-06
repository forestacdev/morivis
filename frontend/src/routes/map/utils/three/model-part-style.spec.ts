import { describe, expect, it } from 'vitest';

import { getModelPartColor } from './model-part-style';

describe('getModelPartColor', () => {
	it('カテゴリ属性を既存のmatch色定義で評価する', () => {
		expect(
			getModelPartColor(
				{
					key: 'class',
					show: true,
					expressions: [{
						type: 'match',
						key: 'class',
						name: '分類',
						mapping: { categories: ['wall'], values: ['#123456'], patterns: [null] }
					}]
				},
				{ class: 'wall' }
			)
		).toBe('#123456');
	});

	it('数値属性をlinear色定義で連続的に評価する', () => {
		expect(
			getModelPartColor(
				{
					key: 'value',
					show: true,
					expressions: [{
						type: 'linear',
						key: 'value',
						name: '値',
						mapping: { range: [0, 100], values: ['#000000', '#ffffff'] }
					}]
				},
				{ value: 50 }
			)
		).toBe('#808080');
	});

	it('match定義にない属性値は元のマテリアル色を維持する', () => {
		expect(
			getModelPartColor(
				{
					key: '樹種',
					show: true,
					expressions: [{
						type: 'match',
						key: '樹種',
						name: '樹種による色分け',
						mapping: {
							categories: ['ヒノキ'],
							values: ['#b2df8a'],
							patterns: [null]
						}
					}]
				},
				{ 樹種: 'ミズナラ' }
			)
		).toBeUndefined();
	});

	it('match定義にない属性値にnoDataの透明色を適用する', () => {
		expect(
			getModelPartColor(
				{
					key: '樹種',
					show: true,
					expressions: [{
						type: 'match',
						key: '樹種',
						name: '樹種による色分け',
						mapping: {
							categories: ['ヒノキ'],
							values: ['#b2df8a'],
							patterns: [null]
						},
						noData: {
							label: 'その他',
							value: 'transparent',
							pattern: null
						}
					}]
				},
				{ 樹種: 'ミズナラ' }
			)
		).toBe('transparent');
	});
});
