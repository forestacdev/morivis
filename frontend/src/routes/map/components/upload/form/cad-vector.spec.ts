import type { FeatureCollection } from '$routes/map/types/geojson';
import { parseDxf } from '$routes/map/utils/formats/dxf';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { prepareCadVectorData } from './cad-vector';
import { createAutoGeoJsonEntry } from './geojson-entry';
import { createVectorEntryGroup } from './vector-entry-group';

vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));

vi.mock('./geojson-entry', () => ({
	createAutoGeoJsonEntry: vi.fn(async (options) => ({
		id: `test-${options.geometryType}`,
		metaData: { name: options.name, bounds: options.bbox },
		format: { geometryType: options.geometryType }
	}))
}));

// CADパーサーと同様、2Dの共通型へ高さを持つ入力を渡す。
const mixed = (): FeatureCollection =>
	({
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				properties: { layer: 'test-points', color: '#ff0000' },
				geometry: { type: 'Point', coordinates: [1, 2, 3] }
			},
			{
				type: 'Feature',
				properties: { layer: 'test-lines', color: '#00ff00' },
				geometry: { type: 'LineString', coordinates: [[0, 0, 1], [2, 2, 1]] }
			},
			{
				type: 'Feature',
				properties: { layer: 'test-polygons', color: '#0000ff' },
				geometry: {
					type: 'Polygon',
					coordinates: [[[3, 0, 2], [4, 0, 2], [4, 1, 2], [3, 1, 2], [3, 0, 2]]]
				}
			}
		]
	}) as unknown as FeatureCollection;

describe('CADの複数図形登録', () => {
	it('選択した種類とCAD色を保持し、入力を変更しない', async () => {
		vi.mocked(createAutoGeoJsonEntry).mockClear();
		const source = mixed();
		const before = structuredClone(source);
		const prepared = prepareCadVectorData(
			source,
			['Point', 'LineString', 'Polygon'],
			'3d',
			'test-cad',
			'DXF'
		);
		const entries = await createVectorEntryGroup(prepared.geojson, prepared.groups);
		expect(entries.map(entry => entry.metaData.name)).toEqual([
			'test-cad／ポイント',
			'test-cad／ライン',
			'test-cad／ポリゴン'
		]);
		expect(entries.map(entry => entry.metaData.bounds)).toEqual([[1, 2, 1, 2], [0, 0, 2, 2], [
			3,
			0,
			4,
			1
		]]);
		for (const [options] of vi.mocked(createAutoGeoJsonEntry).mock.calls) {
			expect(options.allow3d).toBe(true);
			expect(options.colorProperty).toBe('color');
			expect(options.geojson.features).toHaveLength(1);
			expect(options.style).toBeDefined();
		}
		expect(source).toEqual(before);
	});
	it('2Dではポイント・ライン・ポリゴンの高さを除く', () => {
		const source = mixed();
		const prepared = prepareCadVectorData(
			source,
			['Point', 'LineString', 'Polygon'],
			'2d',
			'test-cad',
			'DXF'
		);
		expect(prepared.geojson.features[1].geometry).toEqual({
			type: 'MultiLineString',
			coordinates: [[[0, 0], [2, 2]]]
		});
		expect(prepared.geojson.features[0].geometry).toEqual({
			type: 'Point',
			coordinates: [1, 2]
		});
		expect(prepared.geojson.features[2].geometry).toEqual({
			type: 'MultiPolygon',
			coordinates: [[[[3, 0], [4, 0], [4, 1], [3, 1], [3, 0]]]]
		});
		expect(prepared.groups.every(group => !group.allow3d)).toBe(true);
	});
	it('3Dを明示したラインは高さを保持して3D登録を許可する', async () => {
		vi.mocked(createAutoGeoJsonEntry).mockClear();
		const source = mixed();
		const prepared = prepareCadVectorData(source, ['LineString'], '3d', 'test-cad', 'DXF');
		await createVectorEntryGroup(prepared.geojson, prepared.groups);
		expect(prepared.geojson.features[0].geometry).toEqual(source.features[1].geometry);
		expect(vi.mocked(createAutoGeoJsonEntry).mock.calls[0][0].allow3d).toBe(true);
	});
	it('2D輪郭線では元の線と面の輪郭を同じラインentryへまとめる', () => {
		const prepared = prepareCadVectorData(
			mixed(),
			['Point', 'LineString', 'Polygon'],
			'2d-line',
			'test-cad',
			'DWG'
		);
		expect(prepared.groups.map(group => group.geometryType)).toEqual(['Point', 'LineString']);
		expect(prepared.groups.every(group => !group.allow3d)).toBe(true);
		expect(prepared.geojson.features).toHaveLength(3);
		expect(prepared.geojson.features[0].geometry).toEqual({
			type: 'Point',
			coordinates: [1, 2]
		});
	});
	it('単一種類は既存の名前を保ち、未選択の図形を含めない', () => {
		const prepared = prepareCadVectorData(mixed(), ['LineString'], '2d', 'test-cad', 'DXF');
		expect(prepared.groups.map(group => group.name)).toEqual(['test-cad']);
		expect(prepared.geojson.features).toHaveLength(1);
		expect(prepared.geojson.features[0].geometry.type).toBe('MultiLineString');
	});
	it('全体の変形後も各種類の属性と変換後の座標範囲を引き継ぐ', async () => {
		const prepared = prepareCadVectorData(
			mixed(),
			['Point', 'LineString'],
			'3d',
			'test-cad',
			'DXF'
		);
		const moved = structuredClone(prepared.geojson);
		moved.features[0].geometry = {
			type: 'Point',
			coordinates: [10, 20, 3]
		} as unknown as FeatureCollection['features'][number]['geometry'];
		moved.features[1].geometry = {
			type: 'LineString',
			coordinates: [[9, 18, 1], [11, 20, 1]]
		} as unknown as FeatureCollection['features'][number]['geometry'];
		const entries = await createVectorEntryGroup(moved, prepared.groups);
		expect(entries.map(entry => entry.metaData.bounds)).toEqual([[10, 20, 10, 20], [
			9,
			18,
			11,
			20
		]]);
	});
	it('架空DXFから3種類を読み込み、空選択は拒否する', () => {
		const text = readFileSync(
			new URL('../../../utils/formats/dwg/__fixtures__/test-mixed.dxf', import.meta.url),
			'utf8'
		);
		const parsed = parseDxf(text);
		const prepared = prepareCadVectorData(
			parsed.geojson,
			['Point', 'LineString', 'Polygon'],
			'2d',
			'test-cad',
			'DXF'
		);
		expect(prepared.groups).toHaveLength(3);
		expect(() => prepareCadVectorData(parsed.geojson, [], '2d', 'test-cad', 'DXF')).toThrow(
			'読み込める図形'
		);
	});
});
