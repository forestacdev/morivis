import { createTestRegionalZarr } from '$routes/map/utils/formats/geozarr/__fixtures__/test-regions';
import { describe, expect, it } from 'vitest';
import { parseGpmLayout } from './gpm';
import { createVolumeData } from './volume';

const layout = () =>
	parseGpmLayout(
		JSON.parse(new TextDecoder().decode(createTestRegionalZarr().get('zarr.json'))).attributes
			.gpm,
		'detail',
		{ shape: [2, 2, 2, 2], chunks: [1, 2, 2, 2], dtype: 'float32' }
	)!;
describe('Zarrの3Dテクスチャ用格子', () => {
	it('欠損を透明にし、x・y・高度の配列順と観測値を保つ', () => {
		const input = [1, -1, NaN, 2, 3, Infinity, 0, 4];
		const result = createVolumeData(layout(), 0, input);
		expect([...result.values]).toEqual([1, 0, 0, 2, 3, 0, 0, 4]);
		expect(result.dimensions).toEqual([2, 2, 2]);
		expect(result.bounds).toEqual([-40, 40, -20, 60, 0, 2000]);
		expect(result.anchor[0]).toBeCloseTo(150 / 360);
		result.values[0] = 10;
		expect(input[0]).toBe(1);
	});
	it('不正な格子と極域を拒否する', () => {
		expect(() => createVolumeData(layout(), 0, [])).toThrow('チャンク長');
		expect(() => createVolumeData(layout(), 10, [])).toThrow('高度情報');
		const l = layout();
		l.regions[0].bounds.north = 90;
		expect(() => createVolumeData(l, 0, new Float32Array(8))).toThrow('座標範囲');
	});
});
