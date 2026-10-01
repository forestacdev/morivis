import { describe, expect, it, vi } from 'vitest';
import { getHgtDimensions, getHgtSampleBounds, parseHgt, readHgtFile } from '.';
import { createTestHgt } from './__fixtures__/test-hgt';
import { formatHgt } from './definition';

describe('SRTM HGT', () => {
	it.each([[1201, 1201], [1801, 3601], [3601, 3601]])(
		'%i×%iの符号・バイト順・行列順・欠損を保つ',
		(width, height) => {
			const grid = parseHgt(createTestHgt(width, height), 'N00E000.test-grid.hgt');
			expect([grid.width, grid.height, grid.bandCount]).toEqual([width, height, 1]);
			const band = grid.bands[0];
			expect(band[0]).toBe(258);
			expect(band[1]).toBe(-12);
			expect(band[2]).toBeNaN();
			expect(band[width - 1]).toBe(8);
			expect(band[width]).toBe(0);
			expect(band[width * (height - 1)]).toBe(16);
			expect(band[band.length - 1]).toBe(32767);
			expect(grid.ranges).toEqual([{ min: -12, max: 32767 }]);
			expect(grid.sampleBounds).toEqual([0, 0, 1, 1]);
			expect(grid.crs).toBe('EPSG:4326');
			const [x, dx, , y, , minusDy] = grid.transform!;
			// 外縁ではなく、最初・最後のセル中心が整数の緯度経度に一致する。
			expect(x + dx / 2).toBeCloseTo(0, 12);
			expect(x + (width - 0.5) * dx).toBeCloseTo(1, 12);
			expect(y + minusDy / 2).toBeCloseTo(1, 12);
			expect(y + (height - 0.5) * minusDy).toBeCloseTo(0, 12);
			expect(grid.bbox).toEqual([x, -1 / (height - 1) / 2, 1 + dx / 2, y]);
		}
	);
	it('南緯・西経と大文字拡張子、ZIP内のパスを読む', () => {
		expect(getHgtSampleBounds('test-folder/s01w002.test-grid.HGT')).toEqual([-2, -1, -1, 0]);
	});
	it.each(['N90E000.hgt', 'S91E000.hgt', 'N00E180.hgt', 'N00W181.hgt'])(
		'範囲外の名前%sを拒否する',
		name => {
			expect(() => getHgtSampleBounds(name)).toThrow('範囲外');
		}
	);
	it('日付変更線に接するタイルの標本範囲を復元する', () => {
		expect(getHgtSampleBounds('N00W180.test-grid.hgt')).toEqual([-180, 0, -179, 1]);
		expect(getHgtSampleBounds('N00E179.test-grid.hgt')).toEqual([179, 0, 180, 1]);
	});
	it('名前から位置を得られない場合は架空の地理参照を付けない', () => {
		const grid = parseHgt(createTestHgt(), 'test-renamed.hgt');
		expect(grid.sampleBounds).toBeNull();
		expect(grid.transform).toBeNull();
		expect(grid.bbox).toEqual([0, 0, 1201, 1201]);
	});
	it('全セル欠損はエラーにする', () => {
		expect(() => parseHgt(createTestHgt(1201, 1201, true), 'N00E000.test-grid.hgt'))
			.toThrow('欠損値以外');
	});
	it.each([0, 8, 1201 * 1201 * 2 - 1, 1201 * 1201 * 2 + 2, 1801 * 1801 * 2])(
		'切断・余剰・未対応のサイズ%iを拒否する',
		size => {
			expect(() => getHgtDimensions(size)).toThrow('容量が不正');
		}
	);
	it('上限と不正サイズはファイルをメモリへ読む前に拒否する', async () => {
		for (const size of [formatHgt.limits.maxFileBytes + 1, 12]) {
			const file = new File([], 'N00E000.test-grid.hgt');
			Object.defineProperty(file, 'size', { value: size });
			const read = vi.spyOn(file, 'arrayBuffer');
			await expect(readHgtFile(file)).rejects.toThrow();
			expect(read).not.toHaveBeenCalled();
		}
		expect(getHgtDimensions(formatHgt.limits.maxFileBytes)).toEqual([3601, 3601]);
	});
	it('Fileの読み込みでも同じパーサーを通す', async () => {
		const result = await readHgtFile(new File([createTestHgt()], 'N00E000.test-grid.hgt'));
		expect(result.sampleBounds).toEqual([0, 0, 1, 1]);
		expect(result.bands[0][1]).toBe(-12);
	});
});
