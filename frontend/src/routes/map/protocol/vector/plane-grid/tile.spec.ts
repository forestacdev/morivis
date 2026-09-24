import { PLANE_GRID_BOUNDS, PLANE_GRID_LEVELS } from '$routes/map/utils/mesh/plane-grid-config';
import { getJapanPlaneRectangularInfo } from '$routes/map/utils/proj/japan-plane-rectangular';
import { pointToTile } from '@mapbox/tilebelt';
import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';
import { describe, expect, it } from 'vitest';
import { parsePlaneGridTileUrl } from './request';
import { createPlaneGridTile } from './tile';

describe('平面直角座標のベクタータイル', () => {
	it.each(PLANE_GRID_LEVELS)(
		'$spacing m間隔の線とラベルを読み込める',
		({ spacing, minzoom: z }) => {
			const { originLongitude, originLatitude } = getJapanPlaneRectangularInfo(7)!;
			const [x, y] = pointToTile(originLongitude, originLatitude, z);
			const request = parsePlaneGridTileUrl(
				`plane_grid://tile/7/${spacing}/${z}/${x}/${y}.pbf`
			);
			const layer = new VectorTile(new Pbf(createPlaneGridTile(request))).layers.plane_grid;
			expect(layer.length).toBeGreaterThan(0);
			const axes = new Set();
			for (let i = 0; i < layer.length; i++) {
				const feature = layer.feature(i);
				expect(feature.type).toBe(2);
				expect(feature.properties.zone).toBe(7);
				expect(feature.properties.spacing).toBe(spacing);
				expect(feature.properties.label).toMatch(/^[XY]=-?[\d,]+ m$/);
				axes.add(feature.properties.axis);
			}
			expect(axes).toEqual(new Set(['X', 'Y']));
		}
	);
	it('世界タイルでも描画範囲の外へ線を延ばさない', () => {
		const layer = new VectorTile(
			new Pbf(createPlaneGridTile({ zone: 7, spacing: 100000, z: 0, x: 0, y: 0 }))
		).layers.plane_grid;
		const [west, south, east, north] = PLANE_GRID_BOUNDS;
		for (let i = 0; i < layer.length; i++) {
			const feature = layer.feature(i).toGeoJSON(0, 0, 0);
			const lines = feature.geometry.type === 'LineString'
				? [feature.geometry.coordinates]
				: feature.geometry.type === 'MultiLineString'
				? feature.geometry.coordinates
				: [];
			for (const coordinates of lines) {
				for (const [lng, lat] of coordinates) {
					// ズーム0・extent4096の量子化誤差を許容する。
					expect(lng).toBeGreaterThanOrEqual(west - 0.1);
					expect(lng).toBeLessThanOrEqual(east + 0.1);
					expect(lat).toBeGreaterThanOrEqual(south - 0.1);
					expect(lat).toBeLessThanOrEqual(north + 0.1);
				}
			}
		}
	});
	it('範囲外は空タイル、不正な系番号・ズームはエラーになる', () => {
		expect(createPlaneGridTile({ zone: 7, spacing: 1000, z: 11, x: 0, y: 0 })).toHaveLength(0);
		for (
			const url of [
				'plane_grid://tile/0/1000/11/0/0.pbf',
				'plane_grid://tile/20/1000/11/0/0.pbf',
				'plane_grid://tile/7/10/0/0/0.pbf',
				'plane_grid://tile/7/100000/0/1/0.pbf'
			]
		) {
			expect(() => parsePlaneGridTileUrl(url)).toThrow();
		}
	});
});
