import { describe, expect, it, vi } from 'vitest';

import type { FeatureCollection } from '$routes/map/types/geojson';

vi.mock('$routes/map/data/entries/model', () => ({
	createGeoJson3DEntry: vi.fn(() => ({
		type: 'model',
		format: {
			type: 'geojson-3d'
		}
	}))
}));

vi.mock('$routes/map/data/entries/vector', () => ({
	createGeoJsonEntry: vi.fn(async () => ({
		type: 'vector',
		format: {
			type: 'geojson'
		}
	}))
}));

import { createAutoGeoJsonEntry } from './geojson-entry';

describe('createAutoGeoJsonEntry', () => {
	it('allow3d が false のときは Z 座標があっても vector entry を返す', async () => {
		const geojson = {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					geometry: {
						type: 'LineString',
						coordinates: [
							[0, 0, 10],
							[1, 1, 20]
						]
					},
					properties: {
						layer: 'cad'
					}
				}
			]
		} as unknown as FeatureCollection;

		const entry = await createAutoGeoJsonEntry({
			geojson,
			geometryType: 'LineString',
			name: 'cad',
			bbox: [0, 0, 1, 1],
			attribution: 'DXF',
			allow3d: false
		});

		expect(entry?.type).toBe('vector');
		expect(entry?.format.type).toBe('geojson');
	});
});
