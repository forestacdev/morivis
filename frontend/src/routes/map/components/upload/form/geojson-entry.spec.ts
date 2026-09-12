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

import {
	canRenderGeoJsonAs3d,
	createAutoGeoJsonEntry,
	createGeoJsonEntryWithMode,
	resolveGeoJsonRenderMode
} from './geojson-entry';

const createLineStringWithZ = () =>
	({
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
				properties: {}
			}
		]
	}) as unknown as FeatureCollection;

const createFlatLineString = () =>
	({
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: [
						[0, 0],
						[1, 1]
					]
				},
				properties: {}
			}
		]
	}) as unknown as FeatureCollection;

describe('canRenderGeoJsonAs3d', () => {
	it('Z座標を持つ LineString は3D描画可能と判定する', () => {
		expect(canRenderGeoJsonAs3d(createLineStringWithZ(), 'LineString')).toBe(true);
	});

	it('Z座標がなければ3D描画不可と判定する', () => {
		expect(canRenderGeoJsonAs3d(createFlatLineString(), 'LineString')).toBe(false);
	});
});

describe('resolveGeoJsonRenderMode', () => {
	it('3D描画できないデータに deck を指定しても geojson に落とす', () => {
		expect(resolveGeoJsonRenderMode(createFlatLineString(), 'LineString', 'deck')).toBe(
			'geojson'
		);
	});

	it('3D描画できるデータで deck を指定すれば deck を返す', () => {
		expect(resolveGeoJsonRenderMode(createLineStringWithZ(), 'LineString', 'deck')).toBe(
			'deck'
		);
	});

	it('geojson 指定は Z座標があっても geojson のまま', () => {
		expect(resolveGeoJsonRenderMode(createLineStringWithZ(), 'LineString', 'geojson')).toBe(
			'geojson'
		);
	});
});

describe('createGeoJsonEntryWithMode', () => {
	it('renderMode が geojson なら Z座標があっても vector entry を返す', async () => {
		const entry = await createGeoJsonEntryWithMode({
			geojson: createLineStringWithZ(),
			geometryType: 'LineString',
			name: 'kml',
			bbox: [0, 0, 1, 1],
			attribution: 'KML',
			renderMode: 'geojson'
		});

		expect(entry?.type).toBe('vector');
	});

	it('renderMode が deck で Z座標があれば model entry を返す', async () => {
		const entry = await createGeoJsonEntryWithMode({
			geojson: createLineStringWithZ(),
			geometryType: 'LineString',
			name: 'kml',
			bbox: [0, 0, 1, 1],
			attribution: 'KML',
			renderMode: 'deck'
		});

		expect(entry?.type).toBe('model');
		expect(entry?.metaData.attribution).toBe('KML');
	});

	it('renderMode が deck でも Z座標がなければ vector entry を返す', async () => {
		const entry = await createGeoJsonEntryWithMode({
			geojson: createFlatLineString(),
			geometryType: 'LineString',
			name: 'kml',
			bbox: [0, 0, 1, 1],
			attribution: 'KML',
			renderMode: 'deck'
		});

		expect(entry?.type).toBe('vector');
	});
});

describe('createAutoGeoJsonEntry', () => {
	it('3Dの登録時にDXFの色属性を描画設定へ引き継ぐ', async () => {
		const entry = await createAutoGeoJsonEntry({
			geojson: createLineStringWithZ(),
			geometryType: 'LineString',
			name: 'test-cad',
			bbox: [0, 0, 1, 1],
			attribution: 'DXF',
			colorProperty: 'color'
		});
		expect(entry?.type).toBe('model');
		expect(entry?.style).toMatchObject({ colorProperty: 'color' });
	});

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
