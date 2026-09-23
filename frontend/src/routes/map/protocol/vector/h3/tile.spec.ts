import { createH3Grid } from '$routes/map/utils/mesh/h3';
import { H3_LEVELS } from '$routes/map/utils/mesh/h3-levels';
import { pointToTile, tileToBBOX } from '@mapbox/tilebelt';
import { VectorTile } from '@mapbox/vector-tile';
import { cellToLatLng, getPentagons, getResolution, isValidCell, latLngToCell } from 'h3-js';
import Pbf from 'pbf';
import { describe, expect, it } from 'vitest';
import { parseH3TileUrl } from './request';
import { createH3Tile } from './tile';

describe('H3のタイル生成', () => {
	it.each(H3_LEVELS)(
		'解像度$resolutionの境界とH3コードをMVTに変換できる',
		({ resolution, minzoom: z }) => {
			const [x, y] = pointToTile(1, 1, z);
			const request = parseH3TileUrl(`h3_grid://tile/${resolution}/${z}/${x}/${y}.pbf`);
			const layer = new VectorTile(new Pbf(createH3Tile(request))).layers.h3;
			expect(layer.length).toBeGreaterThan(0);
			const features = Array.from({ length: layer.length }, (_, i) => layer.feature(i));
			expect(new Set(features.map(feature => feature.type))).toEqual(new Set([1, 2]));
			for (const feature of features) {
				expect(isValidCell(String(feature.properties.code))).toBe(true);
				expect(getResolution(String(feature.properties.code))).toBe(resolution);
			}
		}
	);

	it.each([-180, 180])('日付変更線 %s 度のタイルにも境界がある', longitude => {
		const z = 10;
		const x = longitude < 0 ? 0 : 2 ** z - 1;
		const y = 2 ** (z - 1);
		const layer = new VectorTile(new Pbf(createH3Tile({ resolution: 6, z, x, y }))).layers.h3;
		expect(layer.length).toBeGreaterThan(0);
	});

	it('五角形の境界とコードを欠落させない', () => {
		const code = getPentagons(3)[0];
		const [lat, lng] = cellToLatLng(code);
		const grid = createH3Grid(3, [lng - 0.01, lat - 0.01, lng + 0.01, lat + 0.01]);
		expect(
			grid.features.some(feature =>
				feature.properties.code === code && feature.geometry.type === 'LineString'
			)
		).toBe(true);
	});

	it.each([0, 80, -80])('緯度%sのタイル内の任意点を覆うセルを生成する', latitude => {
		const z = 10;
		const [x, y] = pointToTile(1, latitude, z);
		const bounds = tileToBBOX([x, y, z]);
		const [west, south, east, north] = bounds;
		const codes = new Set(
			createH3Grid(6, [west, south, east, north]).features.map(f => f.properties.code)
		);
		for (let i = 0; i <= 8; i++) {
			for (let j = 0; j <= 8; j++) {
				expect(
					codes.has(
						latLngToCell(
							south + (north - south) * i / 8,
							west + (east - west) * j / 8,
							6
						)
					)
				).toBe(true);
			}
		}
	});

	it('日付変更線をまたぐ辺を地球一周の線にしない', () => {
		const grid = createH3Grid(0, [-180, -85, 180, 85]);
		for (const { geometry } of grid.features) {
			if (geometry.type !== 'LineString') continue;
			for (let i = 1; i < geometry.coordinates.length; i++) {
				expect(Math.abs(geometry.coordinates[i][0] - geometry.coordinates[i - 1][0]))
					.toBeLessThanOrEqual(180);
			}
		}
	});

	it('過大な範囲と不正なタイル要求を拒否する', () => {
		expect(() => createH3Grid(15, [-1, -1, 1, 1])).toThrow('too large');
		for (
			const url of [
				'h3_grid://tile/15/0/0/0.pbf',
				'h3_grid://tile/16/22/0/0.pbf',
				'h3_grid://tile/0/2/4/0.pbf'
			]
		) {
			expect(() => parseH3TileUrl(url)).toThrow();
		}
	});
});
