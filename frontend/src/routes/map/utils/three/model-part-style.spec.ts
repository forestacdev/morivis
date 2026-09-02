import { describe, expect, it } from 'vitest';

import { getModelPartColor } from './model-part-style';

describe('getModelPartColor', () => {
	it('カテゴリ属性を既存のmatch色定義で評価する', () => {
		expect(
			getModelPartColor(
				{
					key: 'class',
					show: true,
					expressions: [{ type: 'match', key: 'class', name: '分類', mapping: { categories: ['wall'], values: ['#123456'], patterns: [null] } }]
				},
				{ class: 'wall' }
			)
		).toBe('#123456');
	});

	it('数値属性をlinear色定義で連続的に評価する', () => {
		expect(
			getModelPartColor(
				{ key: 'value', show: true, expressions: [{ type: 'linear', key: 'value', name: '値', mapping: { range: [0, 100], values: ['#000000', '#ffffff'] } }] },
				{ value: 50 }
			)
		).toBe('#808080');
	});
});
