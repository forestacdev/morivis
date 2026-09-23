import { parsePlaneGridTileUrl } from '$routes/map/protocol/vector/plane-grid/request';
import { getJapanPlaneRectangularProj4 } from '$routes/map/utils/proj/japan-plane-rectangular';
import proj4 from 'proj4';
import { describe, expect, it } from 'vitest';
import { createPlaneGridStyle } from './plane-grid';

describe('平面直角座標グリッドのスタイル', () => {
	it('非表示時はソースもレイヤーも作らない', () => {
		expect(createPlaneGridStyle(false, 7, ['test-font'])).toEqual({ sources: {}, layers: [] });
	});
	it('系番号の変更で方眼ソースを入れ替え、全系の原点ソースは保つ', () => {
		const before = createPlaneGridStyle(true, 7, ['test-font']);
		const after = createPlaneGridStyle(true, 8, ['test-font']);
		const gridSources = Object.keys(after.sources).filter(key =>
			after.sources[key].type === 'vector'
		);
		expect(gridSources.some(key => key in before.sources)).toBe(false);
		expect(after.sources['plane-grid-origins']).toEqual(before.sources['plane-grid-origins']);
	});
	it('19系すべてのポイントが各系のX=0・Y=0に位置する', () => {
		const { sources } = createPlaneGridStyle(true, 7, ['test-font']);
		const source = sources['plane-grid-origins'];
		if (
			source.type !== 'geojson' || typeof source.data === 'string'
			|| source.data.type !== 'FeatureCollection'
		) {
			throw new Error('Expected origin points');
		}
		expect(source.data.features).toHaveLength(19);
		expect(new Set(source.data.features.map(feature => feature.id)).size).toBe(19);
		for (const feature of source.data.features) {
			if (feature.geometry.type !== 'Point') throw new Error('Expected a point');
			const definition = getJapanPlaneRectangularProj4(
				Number(feature.properties?.zone),
				'jgd2011'
			)!;
			const [easting, northing] = proj4(
				'EPSG:4326',
				definition,
				feature.geometry.coordinates
			);
			expect(easting).toBeCloseTo(0, 5);
			expect(northing).toBeCloseTo(0, 5);
		}
	});
	it('ズームに応じた単一の間隔で、有効なタイルURLを生成する', () => {
		const { sources, layers } = createPlaneGridStyle(true, 7, ['test-font']);
		for (let zoom = 0; zoom < 24; zoom += 0.5) {
			const visible = layers.filter(l =>
				l.id.endsWith('-line') && zoom >= l.minzoom! && zoom < l.maxzoom!
			);
			expect(visible).toHaveLength(1);
			const layer = visible[0];
			if (!('source' in layer)) throw new Error('Missing source');
			const source = sources[layer.source as string];
			if (source.type !== 'vector') throw new Error('Expected vector source');
			const url = source.tiles![0].replace(
				'{z}',
				String(Math.min(Math.floor(zoom), source.maxzoom!))
			).replace('{x}', '0').replace('{y}', '0');
			expect(parsePlaneGridTileUrl(url).zone).toBe(7);
		}
	});
});
