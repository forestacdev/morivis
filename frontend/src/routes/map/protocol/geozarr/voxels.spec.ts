import { createTestRegionalZarr } from '$routes/map/utils/formats/geozarr/__fixtures__/test-regions';
import { describe, expect, it } from 'vitest';
import { parseGpmLayout } from './gpm';
import { createVoxelCells } from './voxels';
const layout = () =>
	parseGpmLayout(
		JSON.parse(new TextDecoder().decode(createTestRegionalZarr().get('zarr.json'))).attributes
			.gpm,
		'detail',
		{ shape: [2, 2, 2, 2], chunks: [1, 2, 2, 2], dtype: 'float32' }
	)!;

describe('Zarrのボクセル座標', () => {
	it('0・欠損・非有限値を除き、高度ごとに別の箱を作る', () => {
		const result = createVoxelCells(layout(), 0, [0, -1, NaN, 2, 3, Infinity, 0, 4]);
		expect(result.cells.length).toBe(3 * 7);
		expect([result.cells[6], result.cells[13], result.cells[20]].sort()).toEqual([2, 3, 4]);
		const cells = Array.from({ length: 3 }, (_, i) => result.cells.slice(i * 7, i * 7 + 7));
		const lower = cells.find(c => c[6] === 2)!, upper = cells.find(c => c[6] === 4)!;
		expect(upper[0]).toBe(lower[0]);
		expect(upper[1]).toBe(lower[1]);
		expect(upper[2]).toBeCloseTo(lower[2] * 3, 10);
		expect(lower[2]).toBeCloseTo(lower[5] / 2, 10);
	});
	it('セルの東西南北端を元の格子へ戻せる', () => {
		const { cells, anchor } = createVoxelCells(layout(), 0, [1, 0, 0, 0, 0, 0, 0, 0]);
		const west = (anchor[0] + cells[0] - cells[3] / 2) * 360 - 180;
		const east = (anchor[0] + cells[0] + cells[3] / 2) * 360 - 180;
		const lat = (y: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI;
		expect(west).toBeCloseTo(-40, 5);
		expect(east).toBeCloseTo(-30, 5);
		expect(lat(anchor[1] + cells[1] + cells[4] / 2)).toBeCloseTo(40, 5);
		expect(lat(anchor[1] + cells[1] - cells[4] / 2)).toBeCloseTo(50, 5);
	});
	it('不正な地域・チャンク長・高度軸を拒否する', () => {
		expect(() => createVoxelCells(layout(), 2, [])).toThrow('高度情報');
		expect(() => createVoxelCells(layout(), 0, [])).toThrow('チャンク長');
		expect(() => createVoxelCells({ ...layout(), height: undefined }, 0, new Float32Array(8)))
			.toThrow('高度情報');
	});
});
