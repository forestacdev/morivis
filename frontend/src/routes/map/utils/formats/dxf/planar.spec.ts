import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { FeatureCollection } from '$routes/map/types/geojson';

import { parseDxf } from './index';
import { prepareDxfVectorData } from './planar';

const createFaces = () =>
	({
		type: 'FeatureCollection',
		features: [{
			type: 'Feature',
			id: 'test-part',
			properties: { layer: 'test-layer', color: '#ff0000' },
			geometry: {
				type: 'MultiPolygon',
				coordinates: [
					[
						[[0, 0, 4], [6, 0, 4], [6, 6, 4], [0, 6, 4], [0, 0, 4]],
						[[1, 1, 4], [1, 2, 4], [2, 2, 4], [2, 1, 4], [1, 1, 4]]
					],
					[[[0, 0, 0], [6, 0, 0], [6, 0, 4], [0, 0, 4], [0, 0, 0]]]
				]
			}
		}]
	}) as unknown as FeatureCollection;

describe('prepareDxfVectorData', () => {
	it('2Dポリゴンは高さと垂直面を除き、穴・色・部材IDを保持する', () => {
		const source = createFaces();
		const before = structuredClone(source);
		const result = prepareDxfVectorData(source, 'Polygon', '2d');
		expect(result.geometryType).toBe('Polygon');
		expect(result.allow3d).toBe(false);
		expect(result.geojson.features).toEqual([{
			type: 'Feature',
			id: 'test-part',
			properties: { layer: 'test-layer', color: '#ff0000' },
			geometry: {
				type: 'MultiPolygon',
				coordinates: [[
					[[0, 0], [6, 0], [6, 6], [0, 6], [0, 0]],
					[[1, 1], [1, 2], [2, 2], [2, 1], [1, 1]]
				]]
			}
		}]);
		expect(source).toEqual(before);
	});

	it('2Dラインは穴の輪郭を含め、同じ部材の重複辺と高さだけの辺を除く', () => {
		const result = prepareDxfVectorData(createFaces(), 'Polygon', '2d-line');
		expect(result.geometryType).toBe('LineString');
		expect(result.allow3d).toBe(false);
		expect(result.geojson.features[0]).toMatchObject({
			id: 'test-part',
			properties: { layer: 'test-layer', color: '#ff0000' },
			geometry: {
				type: 'MultiLineString',
				coordinates: [
					[[0, 0], [6, 0]],
					[[6, 0], [6, 6]],
					[[6, 6], [0, 6]],
					[[0, 6], [0, 0]],
					[[1, 1], [1, 2]],
					[[1, 2], [2, 2]],
					[[2, 2], [2, 1]],
					[[2, 1], [1, 1]]
				]
			}
		});
	});

	it('DXFパーサーから得た垂直なポリフェイスもラインとして残せる', () => {
		const text = readFileSync(
			new URL('./__fixtures__/test-polyface.dxf', import.meta.url),
			'utf8'
		);
		const { geojson } = parseDxf(text, 'm');
		expect(() => prepareDxfVectorData(geojson, 'Polygon', '2d')).toThrow('2Dライン');
		const result = prepareDxfVectorData(geojson, 'Polygon', '2d-line');
		expect(result.geojson.features[0].geometry).toEqual({
			type: 'MultiLineString',
			coordinates: [[[1, 2], [4, 2]]]
		});
	});

	it('線の2D化ではXYの重複を除き、高さだけの線を除外する', () => {
		const source = {
			type: 'FeatureCollection',
			features: [{
				type: 'Feature',
				properties: {},
				geometry: {
					type: 'MultiLineString',
					coordinates: [
						[[0, 0, 0], [0, 0, 1], [2, 3, 4]],
						[[1, 1, 0], [1, 1, 5]]
					]
				}
			}]
		} as unknown as FeatureCollection;
		expect(prepareDxfVectorData(source, 'LineString', '2d').geojson.features[0].geometry)
			.toEqual({ type: 'MultiLineString', coordinates: [[[0, 0], [2, 3]]] });
	});

	it('点はXY座標で登録できる', () => {
		const source = {
			type: 'FeatureCollection',
			features: [{
				type: 'Feature',
				properties: {},
				geometry: { type: 'Point', coordinates: [2, 3, 4] }
			}]
		} as unknown as FeatureCollection;
		const result = prepareDxfVectorData(source, 'Point', '2d');
		expect(result.geometryType).toBe('Point');
		expect(result.geojson.features[0].geometry).toEqual({ type: 'Point', coordinates: [2, 3] });
	});

	it('自動モードでは3D形状を変更しない', () => {
		const source = createFaces();
		const result = prepareDxfVectorData(source, 'Polygon', 'auto');
		expect(result.geojson).toBe(source);
		expect(result.allow3d).toBe(true);
	});
});
