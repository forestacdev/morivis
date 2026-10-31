import { describe, expect, it } from 'vitest';
import { createLegendEntry } from './__fixtures__/legend';
import { getRasterDimensionRuntimeUpdates } from './dimension-runtime';
import { getRasterLegend, resolveRasterLegend } from './legend';

describe('dimension の凡例', () => {
	it.each(['test-image', 'test-gradient', 'test-category'])(
		'タイルと凡例が同じ値 %s を選ぶ',
		(value) => {
			const entry = createLegendEntry();
			entry.state!.dimension!.currentIndex = entry.properties!.temporal!.dimension.values
				.indexOf(value);
			const before = JSON.stringify(entry);
			expect(getRasterLegend(entry)).toBe(entry.style.legendByDimension![value]);
			expect(getRasterDimensionRuntimeUpdates(entry)).toEqual([{
				type: 'tiles',
				sourceId: 'test-dimension-legend_source',
				tiles: [`https://tiles.example.test/${value}/{z}/{x}/{y}.png`]
			}]);
			expect(JSON.stringify(entry)).toBe(before);
		}
	);

	it('値の順序変更と保存・復元後も凡例の対応を保つ', () => {
		const entry = createLegendEntry();
		entry.properties!.temporal!.dimension.values.reverse();
		entry.state!.dimension!.currentIndex = 2;
		const restored = JSON.parse(JSON.stringify(entry));
		expect(getRasterLegend(restored)).toEqual(entry.style.legendByDimension!['test-gradient']);
	});

	it.each([3, -1, 100, 0.5, NaN])('対応のない値や不正なindex %s は既定の凡例を使う', (index) => {
		const entry = createLegendEntry();
		entry.state!.dimension!.currentIndex = index;
		expect(getRasterLegend(entry)).toBe(entry.style.legend);
	});

	it('dimension・選択状態・対応表のない既存entryは既定の凡例を使う', () => {
		const entry = createLegendEntry();
		delete entry.style.legendByDimension;
		expect(getRasterLegend(entry)).toBe(entry.style.legend);
		const noState = createLegendEntry();
		delete noState.state;
		expect(getRasterLegend(noState)).toBe(noState.style.legend);
		const noDimension = createLegendEntry();
		delete noDimension.properties;
		expect(getRasterLegend(noDimension)).toBe(noDimension.style.legend);
	});

	it('継承プロパティや未定義の対応値は凡例として使用しない', () => {
		const entry = createLegendEntry();
		expect(resolveRasterLegend(entry.style, 'toString')).toBe(entry.style.legend);
		entry.style.legendByDimension!['test-empty'] = undefined;
		expect(resolveRasterLegend(entry.style, 'test-empty')).toBe(entry.style.legend);
	});
});
