import { readFileSync } from 'node:fs';
import proj4 from 'proj4';
import { describe, expect, it } from 'vitest';
import { parseAsciiGrid } from '.';
import { projectAsciiGrid } from './project';

const text = readFileSync(new URL('./__fixtures__/test-grid.asc', import.meta.url), 'utf8');
const prj = readFileSync(new URL('./__fixtures__/test-grid.prj', import.meta.url), 'utf8');

describe('ASCII Grid reprojection', () => {
	it('WGS84の指定でも上下反転・半セルずれを起こさない', () => {
		const source = parseAsciiGrid(text);
		const result = projectAsciiGrid(source, 'EPSG:4326');
		result.bbox.forEach((value, index) => expect(value).toBeCloseTo(source.bbox[index], 10));
		expect([...result.band]).toEqual([...source.band]);
	});
	it('同梱PRJのWKTを使って座標を変換し、欠損セルを残す', () => {
		const source = parseAsciiGrid(text);
		const result = projectAsciiGrid(source, prj);
		const expected = proj4(prj, 'EPSG:4326', [30, 20]);
		expect(result.bbox[2]).toBeCloseTo(expected[0], 10);
		expect(result.bbox[3]).toBeCloseTo(expected[1], 10);
		expect([...result.band]).toEqual([...source.band]);
		expect(result.band).not.toBe(source.band);
	});
	it('外枠だけでなく、出力セル中心の逆投影でセルを選ぶ', () => {
		const source = parseAsciiGrid(
			text.replace('cellsize 10', 'cellsize 1000000').replace(
				'yllcorner 0',
				'yllcorner 4000000'
			)
		);
		const result = projectAsciiGrid(source, 'EPSG:3857');
		const [west, , , north] = result.bbox;
		for (let row = 0; row < result.height; row++) {
			for (let col = 0; col < result.width; col++) {
				const xy = proj4('EPSG:4326', 'EPSG:3857', [
					west + (col + 0.5) * result.cellSize[0],
					north - (row + 0.5) * result.cellSize[1]
				]);
				const index =
					Math.floor((source.bbox[3] - xy[1]) / source.cellSize[1]) * source.width
					+ Math.floor((xy[0] - source.bbox[0]) / source.cellSize[0]);
				expect(result.band[row * result.width + col]).toEqual(source.band[index]);
			}
		}
	});
	it('座標系不明・不正なPRJ・範囲外を緯度経度と決めつけない', () => {
		const source = parseAsciiGrid(text);
		expect(() => projectAsciiGrid(source, '')).toThrow('座標系');
		expect(() => projectAsciiGrid(source, 'test-invalid-prj')).toThrow('座標系');
		expect(() =>
			projectAsciiGrid(
				parseAsciiGrid(text.replace('xllcorner 0', 'xllcorner 500')),
				'EPSG:4326'
			)
		).toThrow('範囲外');
	});
});
