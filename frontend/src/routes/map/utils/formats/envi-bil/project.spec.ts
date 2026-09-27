import { readFileSync } from 'node:fs';
import proj4 from 'proj4';
import { describe, expect, it } from 'vitest';
import { parseRawRaster, parseRawRasterHeader } from '.';
import { projectRawRaster } from './project';

const grid = () =>
	parseRawRaster(
		parseRawRasterHeader(
			readFileSync(new URL('./__fixtures__/test-color.hdr', import.meta.url), 'utf8')
		),
		new Uint8Array(readFileSync(new URL('./__fixtures__/test-color.bil', import.meta.url)))
			.buffer
	);
describe('raw raster projection', () => {
	it('WGS84で半セルずれ・上下反転せず全バンドの値と欠損を保つ', () => {
		const source = grid(), result = projectRawRaster(source, source.crs);
		expect(result.bbox).toEqual(source.bbox);
		expect(result.bands).toEqual(source.bands);
		expect(result.bands[0]).not.toBe(source.bands[0]);
	});
	it('投影座標からセルの中心を逆投影する', () => {
		const source = grid();
		source.transform = [0, 100000, 0, 4000000, 0, -100000];
		const result = projectRawRaster(source, 'EPSG:3857');
		const eastNorth = proj4('EPSG:3857', 'EPSG:4326', [300000, 4000000]);
		expect(result.bbox[2]).toBeCloseTo(eastNorth[0], 10);
		expect(result.bbox[3]).toBeCloseTo(eastNorth[1], 10);
		expect(result.bands).toEqual(source.bands);
	});
	it('90度回転した格子の値を北上の画像へ並べ直す', () => {
		const source = grid();
		source.width = 2;
		source.height = 3;
		source.transform = [0, 0, 1, 0, 1, 0];
		const result = projectRawRaster(source, 'EPSG:4326');
		result.bbox.forEach((value, index) => expect(value).toBeCloseTo([0, 0, 3, 2][index], 12));
		expect([...result.bands[0]]).toEqual([2, -2, 2, -2, 1, 0]);
	});
	it('座標系・位置の欠落、範囲外、日付変更線を黙って補わない', () => {
		expect(() => projectRawRaster(grid(), '')).toThrow('座標系');
		expect(() => projectRawRaster(grid(), 'test-invalid')).toThrow('座標系');
		expect(() => projectRawRaster({ ...grid(), transform: null }, 'EPSG:4326')).toThrow(
			'位置情報'
		);
		expect(() => projectRawRaster({ ...grid(), transform: [500, 1, 0, 0, 0, -1] }, 'EPSG:4326'))
			.toThrow('範囲外');
	});
});
