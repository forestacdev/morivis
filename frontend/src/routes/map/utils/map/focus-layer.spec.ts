import type { MorivisLayerEntry } from '$routes/map/data/types';
import { describe, expect, it } from 'vitest';

import { canFocusLayer, getSinglePointFocus } from './focus-layer';

const createTestEntry = (
	geometryType: 'Point' | 'LineString',
	bounds: [number, number, number, number]
) => ({
	type: 'vector',
	format: { geometryType },
	metaData: { bounds }
}) as MorivisLayerEntry;

describe('getSinglePointFocus', () => {
	it('一点に縮退したPoint entryへzoom 14の設定を返す', () => {
		const entry = createTestEntry('Point', [10, 20, 10, 20]);

		expect(getSinglePointFocus(entry)).toEqual({ center: [10, 20], zoom: 14 });
	});

	it('複数地点に広がるPoint entryは対象外にする', () => {
		const entry = createTestEntry('Point', [10, 20, 11, 21]);

		expect(getSinglePointFocus(entry)).toBeNull();
	});

	it('一点に縮退したLineString entryは対象外にする', () => {
		const entry = createTestEntry('LineString', [10, 20, 10, 20]);

		expect(getSinglePointFocus(entry)).toBeNull();
	});
});

describe('canFocusLayer', () => {
	const entry = (
		location: MorivisLayerEntry['metaData']['location'],
		bounds: [number, number, number, number]
	) => ({
		...createTestEntry('Point', bounds),
		metaData: { ...createTestEntry('Point', bounds).metaData, location }
	});
	it.each<[number, number, number, number]>([
		[0, 0, 10, 10],
		[-180, -60, 180, 60],
		[0, -90, 10, 90],
		[2, 3, 2, 3],
		[170, -10, -170, 10]
	])('世界でも範囲が狭ければ表示する (%s, %s, %s, %s)', (...bounds) => {
		expect(canFocusLayer(entry('世界', bounds))).toBe(true);
	});
	it.each<[number, number, number, number]>([
		[-180, -90, 180, 90],
		[-180, -85.051128779807, 180, 85.051128779807],
		[-180, -85.051129, 180, 85.051129],
		[-180, -85.051128, 180, 85.051128],
		[0, -90, 360, 90]
	])('世界全体を覆う範囲は非表示にする (%s, %s, %s, %s)', (...bounds) => {
		expect(canFocusLayer(entry('世界', bounds))).toBe(false);
	});
	it('全国とその他の分類の表示条件を維持する', () => {
		expect(canFocusLayer(entry('全国', [0, 0, 10, 10]))).toBe(false);
		expect(canFocusLayer(entry('不明', [0, 0, 10, 10]))).toBe(true);
	});
	it('世界の範囲が不正な場合は表示しない', () => {
		expect(canFocusLayer(entry('世界', [NaN, 0, 10, 10]))).toBe(false);
		expect(canFocusLayer(entry('世界', [0, 10, 10, 0]))).toBe(false);
	});
});
