import proj4 from 'proj4';
import { describe, expect, it } from 'vitest';
import { coordinateAxis, type GeoZarrGrid, gridPixel, tileLatitude } from './grid';
const grid: GeoZarrGrid = {
	bbox: [-20, 40, 20, 80],
	projection: 'EPSG:4326',
	xDescending: false,
	yAscending: true
};
describe('Zarrの空間軸', () => {
	it('セル中心から外周を求め、下降軸も保持する', () => {
		expect(coordinateAxis([15, 5, -5, -15])).toEqual({ min: -20, max: 20, descending: true });
		expect(coordinateAxis([45, 55, 65, 75])).toEqual({ min: 40, max: 80, descending: false });
	});
	it('不等間隔を規則格子として描かない', () =>
		expect(() => coordinateAxis([1, 2, 4])).toThrow('不等間隔'));
	it('緯度上昇軸と経度下降軸を正しい画素へ対応させる', () => {
		expect(gridPixel(grid, 4, 4, -15, 45)).toEqual([0, 0]);
		expect(gridPixel({ ...grid, xDescending: true }, 4, 4, -15, 45)).toEqual([3, 0]);
	});
	it('0〜360度の経度を日付変更線の両側で参照できる', () => {
		expect(gridPixel({ ...grid, bbox: [0, -90, 360, 90] }, 360, 180, -10.5, 0.5)?.[0]).toBe(
			349
		);
	});
	it('Mercatorの画素中心を緯度に戻す', () => {
		const lat = tileLatitude(0, 0, 64, 256);
		const merc = proj4('EPSG:4326', 'EPSG:3857', [0, lat]);
		const world = proj4('EPSG:4326', 'EPSG:3857', [180, 0])[0];
		expect(merc[1] / world).toBeCloseTo(1 - 2 * 64.5 / 256);
	});
	it('投影座標系へ逆変換して画素を選ぶ', () => {
		const projected: GeoZarrGrid = {
			...grid,
			projection: 'EPSG:3857',
			bbox: [-100, -100, 100, 100],
			yAscending: false
		};
		const [lon, lat] = proj4('EPSG:3857', 'EPSG:4326', [25, 25]);
		expect(gridPixel(projected, 4, 4, lon, lat)).toEqual([2, 1]);
	});
});
