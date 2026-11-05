import { createS2Grid } from '$routes/map/utils/mesh/s2';
import { S2_LEVELS } from '$routes/map/utils/mesh/s2-levels';
import { pointToTile, tileToBBOX } from '@mapbox/tilebelt';
import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';
import { s2 } from 's2js';
import { describe, expect, it } from 'vitest';
import { parseS2TileUrl } from './request';
import { createS2Tile } from './tile';

describe('S2のタイル生成', () => {
	it.each(S2_LEVELS)('レベル$levelの境界とセルIDをMVTに変換する', ({ level, minzoom: z }) => {
		const [x, y] = pointToTile(1, 1, z);
		const request = parseS2TileUrl(`s2_grid://tile/${level}/${z}/${x}/${y}.pbf`);
		const layer = new VectorTile(new Pbf(createS2Tile(request))).layers.s2;
		expect(layer.length).toBeGreaterThan(0);
		const features = Array.from({ length: layer.length }, (_, i) => layer.feature(i));
		expect(new Set(features.map(feature => feature.type))).toEqual(new Set([1, 2]));
		for (const feature of features) {
			const code = String(feature.properties.code);
			const id = s2.cellid.fromToken(code);
			expect(s2.cellid.valid(id)).toBe(true);
			expect(s2.cellid.level(id)).toBe(level);
			expect(s2.cellid.toToken(id)).toBe(code);
		}
	});

	it.each([-180, 180])('日付変更線%s度の両側に境界を生成する', longitude => {
		const z = 10;
		const x = longitude < 0 ? 0 : 2 ** z - 1;
		const layer =
			new VectorTile(new Pbf(createS2Tile({ level: z, z, x, y: 2 ** (z - 1) }))).layers.s2;
		expect(layer.length).toBeGreaterThan(0);
	});

	// 架空の座標格子。面境界・日付変更線・高緯度の交差判定を検証する。
	it.each([0, 80, -80, 85, -85])('緯度%sのタイル内の任意点を覆うセルが欠けない', latitude => {
		for (const longitude of [-179.99, -45, 1, 45, 179.99]) {
			const z = 10;
			const bounds = tileToBBOX(pointToTile(longitude, latitude, z));
			const [west, south, east, north] = bounds;
			const codes = new Set(
				createS2Grid(z, [west, south, east, north]).features.map(f => f.properties.code)
			);
			for (let i = 0; i <= 8; i++) {
				for (let j = 0; j <= 8; j++) {
					const leaf = s2.cellid.fromLatLng(s2.LatLng.fromDegrees(
						south + (north - south) * i / 8,
						west + (east - west) * j / 8
					));
					expect(codes.has(s2.cellid.toToken(s2.cellid.parent(leaf, z)))).toBe(true);
				}
			}
		}
	});

	it.each([0, 1, 2])('レベル%sの極・日付変更線で地球一周の線を作らない', level => {
		const grid = createS2Grid(level, [-180, -85, 180, 85]);
		for (const { geometry } of grid.features) {
			if (geometry.type !== 'LineString') continue;
			for (const coordinate of geometry.coordinates) {
				expect(Math.abs(coordinate[1])).toBeLessThanOrEqual(85.05112878);
			}
			for (let i = 1; i < geometry.coordinates.length; i++) {
				expect(Math.abs(geometry.coordinates[i][0] - geometry.coordinates[i - 1][0]))
					.toBeLessThanOrEqual(180);
			}
		}
	});

	it('レベル0では6面の境界と16進トークンを生成する', () => {
		const grid = createS2Grid(0, [-180, -85, 180, 85]);
		expect(new Set(grid.features.map(f => f.properties.code))).toEqual(
			new Set(['1', '3', '5', '7', '9', 'b'])
		);
		const lines = grid.features.filter(f => f.geometry.type === 'LineString');
		expect(lines).toHaveLength(24);
		expect(
			lines.some(f => f.geometry.type === 'LineString' && f.geometry.coordinates.length > 2)
		).toBe(true);
	});

	it('過大な範囲と不正な要求を拒否する', () => {
		expect(() => createS2Grid(30, [-1, -1, 1, 1])).toThrow('too large');
		for (const level of [-1, 31, 0.5, NaN]) {
			expect(() => createS2Grid(level, [-1, -1, 1, 1])).toThrow();
		}
		for (
			const url of [
				's2_grid://tile/10/0/0/0.pbf',
				's2_grid://tile/24/24/0/0.pbf',
				's2_grid://tile/1/1/2/0.pbf',
				's2_grid://tile/1/1/-1/0.pbf',
				's2_grid://tile/1/1/0/9007199254740992.pbf'
			]
		) expect(() => parseS2TileUrl(url)).toThrow();
	});
});
