import {
	getJapanPlaneRectangularProj4,
	getJapanPlaneRectangularSystems
} from '$routes/map/utils/proj/japan-plane-rectangular';
import proj4 from 'proj4';
import { describe, expect, it } from 'vitest';
import { createPlaneGrid } from './plane-grid';
import { PLANE_GRID_BOUNDS } from './plane-grid-config';

describe('平面直角座標グリッド', () => {
	it.each(getJapanPlaneRectangularSystems())('第$zone系でX=北・Y=東の方眼を作る', ({ zone }) => {
		const projection = proj4('EPSG:4326', getJapanPlaneRectangularProj4(zone, 'jgd2011')!);
		const [west, south] = projection.inverse([-2000, -2000]);
		const [east, north] = projection.inverse([2000, 2000]);
		const grid = createPlaneGrid(zone, 1000, [west, south, east, north]);
		expect(grid.features.length).toBeGreaterThan(0);
		for (const { geometry, properties } of grid.features) {
			expect(Math.abs(properties.value % 1000)).toBe(0);
			expect(properties.label).toBe(
				`${properties.axis}=${properties.value.toLocaleString('en-US')} m`
			);
			for (const position of geometry.coordinates) {
				const [easting, northing] = projection.forward(position);
				expect(properties.axis === 'X' ? northing : easting).toBeCloseTo(
					properties.value,
					4
				);
			}
		}
		for (const axis of ['X', 'Y']) {
			expect(grid.features.some(f => f.properties.axis === axis && f.properties.value === 0))
				.toBe(true);
			expect(grid.features.some(f => f.properties.axis === axis && f.properties.value < 0))
				.toBe(true);
		}
	});

	it('日本周辺の範囲外では何も生成しない', () => {
		expect(createPlaneGrid(7, 1000, [0, 0, 1, 1]).features).toEqual([]);
	});
	it('細かい方眼の広域生成と不正な入力を拒否する', () => {
		expect(() => createPlaneGrid(7, 10, PLANE_GRID_BOUNDS)).toThrow('too large');
		expect(() => createPlaneGrid(20, 1000, PLANE_GRID_BOUNDS)).toThrow('zone');
		expect(() => createPlaneGrid(7, 0, PLANE_GRID_BOUNDS)).toThrow('spacing');
		expect(() => createPlaneGrid(7, 1000, [NaN, 0, 1, 1])).toThrow('bounds');
	});
});
