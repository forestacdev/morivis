import { describe, expect, it } from 'vitest';

import type { FeatureCollection } from '$routes/map/types/geojson';

import { getSxfUnitScaleFactor, inferSxfCoordinateUnit, scaleSxfFeatureCollection } from './units';

const createFeatureCollection = (coordinates: number[][]): FeatureCollection => ({
	type: 'FeatureCollection',
	features: coordinates.map(([x, y], index) => ({
		type: 'Feature',
		id: `feature-${index}`,
		geometry: {
			type: 'Point',
			coordinates: [x, y]
		},
		properties: {
			radius: 1000,
			textHeight: 2000
		}
	}))
});

describe('sxf units', () => {
	it('広いスパンの座標は mm と推定する', () => {
		const geojson = createFeatureCollection([
			[0, 0],
			[250000, 180000]
		]);

		expect(inferSxfCoordinateUnit(geojson)).toBe('mm');
	});

	it('狭いスパンの座標は m と推定する', () => {
		const geojson = createFeatureCollection([
			[0, 0],
			[250, 180]
		]);

		expect(inferSxfCoordinateUnit(geojson)).toBe('m');
	});

	it('mm 指定時は座標と長さ属性を 1/1000 に補正する', () => {
		const geojson: FeatureCollection = {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					id: 'line-1',
					geometry: {
						type: 'LineString',
						coordinates: [
							[1000, 2000],
							[4000, 5000]
						]
					},
					properties: {
						radius: 3000,
						textHeight: 1500
					}
				}
			]
		};

		const scaled = scaleSxfFeatureCollection(geojson, 'mm');

		expect(getSxfUnitScaleFactor('mm')).toBe(0.001);
		expect(scaled.features[0]?.geometry).toEqual({
			type: 'LineString',
			coordinates: [
				[1, 2],
				[4, 5]
			]
		});
		expect(scaled.features[0]?.properties).toMatchObject({
			radius: 3,
			textHeight: 1.5
		});
		expect(geojson.features[0]?.geometry).toEqual({
			type: 'LineString',
			coordinates: [
				[1000, 2000],
				[4000, 5000]
			]
		});
	});
});
