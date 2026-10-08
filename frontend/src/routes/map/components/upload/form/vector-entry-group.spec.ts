import { buildDmStyle, buildSxfStyle } from '$routes/map/data/entries/vector';
import type { FeatureCollection } from '$routes/map/types/geojson';
import { describe, expect, it, vi } from 'vitest';
import { createAutoGeoJsonEntry } from './geojson-entry';
import {
	createVectorEntryGroup,
	filterByGeometryTypes,
	prepareVectorEntryGroups
} from './vector-entry-group';

vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));
vi.mock('./geojson-entry', () => ({
	createAutoGeoJsonEntry: vi.fn(async options => ({
		id: `test-${options.geometryType}`,
		metaData: { name: options.name, bounds: options.bbox },
		style: options.style
	}))
}));

const mixed: FeatureCollection = {
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			properties: { layer: 'test-points', className: 'test-symbol', dataType: '点' },
			geometry: { type: 'Point', coordinates: [1, 1] }
		},
		{
			type: 'Feature',
			properties: { layer: 'test-points', text: 'test-label', dataType: '注記' },
			geometry: { type: 'Point', coordinates: [2, 2] }
		},
		{
			type: 'Feature',
			properties: { layer: 'test-lines', type: 'test-line' },
			geometry: { type: 'MultiLineString', coordinates: [[[0, 0], [2, 2]]] }
		},
		{
			type: 'Feature',
			properties: { layer: 'test-polygons' },
			geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }
		}
	]
};

describe('複数図形の表示設定と登録', () => {
	it.each([['DM', buildDmStyle], ['SXF', buildSxfStyle]] as const)(
		'%sの種類別スタイルを位置合わせ後にも引き継ぐ',
		async (format, buildStyle) => {
			vi.mocked(createAutoGeoJsonEntry).mockClear();
			const selected = filterByGeometryTypes(mixed, ['Point', 'LineString']);
			const build = vi.fn(buildStyle);
			const groups = prepareVectorEntryGroups(selected, 'test-drawing', format, build);
			expect(groups.map(group => group.name)).toEqual([
				'test-drawing／ポイント',
				'test-drawing／ライン'
			]);
			// 後続の注記だけが持つ属性もラベル選択肢に含める。
			expect(build.mock.calls[0][2]).toContain('text');
			expect(build.mock.calls[1][0].features).toHaveLength(1);
			const moved = structuredClone(selected);
			moved.features[0].geometry = { type: 'Point', coordinates: [10, 20] };
			await createVectorEntryGroup(moved, groups);
			const calls = vi.mocked(createAutoGeoJsonEntry).mock.calls.map(([options]) => options);
			expect(calls[0]).toMatchObject({
				bbox: [2, 2, 10, 20],
				attribution: format,
				allow3d: false
			});
			expect(calls[1]).toMatchObject({
				geometryType: 'LineString',
				bbox: [0, 0, 2, 2],
				allow3d: false
			});
			expect(calls.map(options => options.style)).toEqual(groups.map(group => group.style));
			expect(mixed.features[0].geometry).toEqual({ type: 'Point', coordinates: [1, 1] });
		}
	);
	it('1種類だけ残った場合は元の名前を使い、空選択では登録しない', async () => {
		const single = filterByGeometryTypes(mixed, ['LineString']);
		expect(
			prepareVectorEntryGroups(single, 'test-drawing', 'SXF', buildSxfStyle).map(group =>
				group.name
			)
		).toEqual(['test-drawing']);
		const empty = filterByGeometryTypes(mixed, []);
		expect(empty.features).toHaveLength(0);
		await expect(createVectorEntryGroup(empty, [])).rejects.toThrow(
			'読み込める図形がありません'
		);
	});
});
