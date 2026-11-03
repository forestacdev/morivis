import { pointToTile, tileToBBOX } from '@mapbox/tilebelt';
import { VectorTile } from '@mapbox/vector-tile';
import type { FeatureCollection } from 'geojson';
import Pbf from 'pbf';
import { describe, expect, it } from 'vitest';
import { getNativeSheetTiles, parseTopographicSheetTileUrl } from './request';
import { normalizeSheetFeatures } from './features';
import { createGeojsonTile } from '../tile';

const pointSheet: FeatureCollection = {
	type: 'FeatureCollection', features: [{
		type: 'Feature', properties: { 図名: 'test-図郭', 図郭座標: [[0, 0], [2, 2]] },
		geometry: { type: 'Point', coordinates: [1, 1] }
	}]
};

describe('図郭の変換', () => {
	it('点の図郭座標を枠へ変換し、隣接タイルの同じ図郭を重複させない', () => {
		const result = normalizeSheetFeatures([pointSheet, pointSheet]);
		expect(result.features).toHaveLength(2);
		expect(result.features[0].geometry).toEqual({
			type: 'LineString', coordinates: [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]
		});
		expect(result.features[1]).toMatchObject({ properties: { name: 'test-図郭' }, geometry: { coordinates: [1, 1] } });
	});
	it('Polygonの外周と中心を取得する', () => {
		const result = normalizeSheetFeatures([{
			type: 'FeatureCollection', features: [{
				type: 'Feature', properties: { name: 'test-polygon' },
				geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]]] }
			}]
		}]);
		expect(result.features.map(f => f.geometry.type)).toEqual(['LineString', 'Point']);
		expect(result.features[1].geometry).toEqual({ type: 'Point', coordinates: [1, 1] });
	});
	it('図郭内部のタイルに偽の枠を生成せず、日本語図名をMVTへ渡す', () => {
		const [x, y, z] = pointToTile(1, 1, 11);
		const layer = new VectorTile(new Pbf(createGeojsonTile({ geojson: pointSheet, z, x, y, transform: 'topographic-sheets' }))).layers.geojsonLayer;
		expect(layer.length).toBe(1);
		expect(layer.feature(0).type).toBe(1);
		expect(layer.feature(0).properties.name).toBe('test-図郭');
		const decoded = layer.feature(0).toGeoJSON(x, y, z);
		if (decoded.geometry.type !== 'Point') throw new Error('Expected Point');
		expect(decoded.geometry.coordinates[0]).toBeCloseTo(1, 4);
		expect(decoded.geometry.coordinates[1]).toBeCloseTo(1, 4);
	});
	it('図名の点が隣の配信タイルにあっても枠線を描画できる', () => {
		const [x, y, z] = pointToTile(1, 1, 8);
		const [west, south, east, north] = tileToBBOX([x, y, z]);
		const centerY = (south + north) / 2;
		const data: FeatureCollection = {
			type: 'FeatureCollection', features: [{
				type: 'Feature', properties: { 図名: 'test-neighbor', 図郭座標: [[west, centerY - 0.1], [east + 0.1, centerY + 0.1]] },
				geometry: { type: 'Point', coordinates: [east + 0.05, centerY] }
			}]
		};
		const [tx, ty, tz] = pointToTile((west + east) / 2, centerY + 0.1, 14);
		const tile = { scale: 25000 as const, z: tz, x: tx, y: ty };
		expect(getNativeSheetTiles(tile).urls).toContain(`https://maps.gsi.go.jp/xyz/zk25000/8/${x + 1}/${y}.geojson`);
		const layer = new VectorTile(new Pbf(createGeojsonTile({ geojson: data, ...tile, transform: 'topographic-sheets' }))).layers.geojsonLayer;
		expect(layer.feature(0).type).toBe(2);
	});
	it('不正な縮尺・ズーム・タイル座標を拒否する', () => {
		for (const path of ['123/5/0/0', '25000/8/0/0', '25000/19/0/0', '50000/10/1024/0', '200000/5/0/-1']) {
			expect(() => parseTopographicSheetTileUrl(`https://maps.gsi.go.jp/xyz/zk${path}.geojson`)).toThrow();
		}
	});
});
