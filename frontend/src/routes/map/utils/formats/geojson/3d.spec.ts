import { describe, expect, it } from 'vitest';

import type { FeatureCollection } from '$routes/map/types/geojson';

import { has3dGeometryForType } from './3d';

describe('has3dGeometryForType', () => {
	it('Z=0 だけのラインは 3D 扱いしない', () => {
		const geojson = {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					geometry: {
						type: 'LineString',
						coordinates: [
							[0, 0, 0],
							[10, 5, 0]
						]
					},
					properties: {}
				}
			]
		} as unknown as FeatureCollection;

		expect(has3dGeometryForType(geojson, 'LineString')).toBe(false);
	});

	it('非ゼロの Z を含むポリゴンは 3D 扱いする', () => {
		const geojson = {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					geometry: {
						type: 'Polygon',
						coordinates: [
							[
								[0, 0, 12],
								[1, 0, 12],
								[1, 1, 12],
								[0, 0, 12]
							]
						]
					},
					properties: {}
				}
			]
		} as unknown as FeatureCollection;

		expect(has3dGeometryForType(geojson, 'Polygon')).toBe(true);
	});
});
