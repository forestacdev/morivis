import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseAsciiGrid } from '.';

const fixture = readFileSync(new URL('./__fixtures__/test-grid.asc', import.meta.url), 'utf8');

describe('ASCII Grid parser', () => {
	it('北から南へのセル順とゼロ・小数・欠損値を保持する', () => {
		const grid = parseAsciiGrid(fixture);
		expect([grid.width, grid.height]).toEqual([3, 2]);
		expect(grid.bbox).toEqual([0, 0, 30, 20]);
		expect([...grid.band]).toEqual([1, 2, NaN, 4, 0, -2.5]);
		expect(grid.range).toEqual({ min: -2.5, max: 4 });
	});
	it('CENTERはセル半分を引いて外縁のbboxにする', () => {
		const grid = parseAsciiGrid(
			fixture.replace('xllcorner 0', 'xllcenter 5').replace('yllcorner 0', 'yllcenter 5')
		);
		expect(grid.bbox).toEqual([0, 0, 30, 20]);
	});
	it('GDALのDX/DYによる長方形セルを読む', () => {
		const grid = parseAsciiGrid(fixture.replace('cellsize 10', 'DX 4\nDY 7'));
		expect(grid.bbox).toEqual([0, 0, 12, 14]);
		expect(grid.cellSize).toEqual([4, 7]);
	});
	it('BOM・大文字・CRLF・タブ・科学表記・行途中の改行を許容する', () => {
		const grid = parseAsciiGrid(
			'\uFEFF'
				+ fixture.toUpperCase().replaceAll('\n', '\r\n').replace(
					'1 2 -9999',
					'1e0\t2D0\n-9999'
				)
		);
		expect([...grid.band]).toEqual([1, 2, NaN, 4, 0, -2.5]);
	});
	it('NODATA省略時の-9999と明示的なNaNを扱う', () => {
		expect(parseAsciiGrid(fixture.replace('NODATA_value -9999\n', '')).band[2]).toBeNaN();
		expect(parseAsciiGrid(fixture.replaceAll('-9999', 'NaN')).band[2]).toBeNaN();
	});
	it.each([
		['ncols 3', 'ncols 0'],
		['nrows 2', 'nrows 1.5'],
		['cellsize 10', 'cellsize -1'],
		['cellsize 10', 'cellsize 0'],
		['cellsize 10', 'DX 1'],
		['cellsize 10', 'cellsize 1\nDX 2\nDY 2'],
		['xllcorner 0', 'xllcenter 0'],
		['xllcorner 0', 'xllcorner 0\nxllcenter 0'],
		['ncols 3', 'ncols 3\nncols 3'],
		['ncols 3', 'ncols 9999999999'],
		['1 2 -9999', '1 test -9999'],
		['1 2 -9999', '1 Infinity -9999'],
		['1 2 -9999', '1 2junk -9999'],
		['nrows 2\n', ''],
		['4 0 -2.5', '4 0'],
		['4 0 -2.5', '4 0 -2.5 6'],
		['1 2 -9999\n4 0 -2.5', '-9999 -9999 -9999 -9999 -9999 -9999']
	])('不正な入力を拒否する: %s → %s', (before, after) => {
		expect(() => parseAsciiGrid(fixture.replace(before, after))).toThrow();
	});
});
