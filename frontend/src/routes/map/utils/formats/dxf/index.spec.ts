import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { has3dGeometryForType } from '../geojson/3d';

import { dxfToGeoJson, parseDxf } from '.';

const POLYFACE_DXF = readFileSync(
	new URL('./__fixtures__/test-polyface.dxf', import.meta.url),
	'utf8'
);

const EMPTY_LWPOLYLINE_DXF = `0
SECTION
2
ENTITIES
0
LWPOLYLINE
8
empty-layer
90
0
70
0
0
LINE
8
line-layer
10
0
20
0
11
10
21
5
0
ENDSEC
0
EOF`;

const MILLIMETER_LINE_DXF = `0
SECTION
2
HEADER
9
$INSUNITS
70
4
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
mm-layer
10
1000
20
2000
11
3000
21
4000
0
ENDSEC
0
EOF`;

const UNITLESS_LINE_DXF = `0
SECTION
2
HEADER
9
$INSUNITS
70
0
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
raw-layer
10
1000
20
2000
11
3000
21
4000
0
ENDSEC
0
EOF`;

const LINE_WITH_Z_DXF = `0
SECTION
2
ENTITIES
0
LINE
8
3d-line
10
1
20
2
30
3
11
4
21
5
31
6
0
ENDSEC
0
EOF`;

const FACE_3D_DXF = `0
SECTION
2
ENTITIES
0
3DFACE
8
face-layer
10
0
20
0
30
10
11
1
21
0
31
11
12
1
22
1
32
12
13
0
23
1
33
13
0
ENDSEC
0
EOF`;

describe('dxf parser', () => {
	it('単位未指定と単位なしを自動判定済みとして扱わない', () => {
		expect(parseDxf(LINE_WITH_Z_DXF).sourceUnitCode).toBeNull();
		expect(parseDxf(UNITLESS_LINE_DXF).sourceUnitCode).toBeNull();
		expect(parseDxf(MILLIMETER_LINE_DXF).sourceUnitCode).toBe(4);
	});

	it('手動のmm指定でXYZを同じ倍率で換算する', () => {
		const result = parseDxf(LINE_WITH_Z_DXF, 'mm');
		expect(result.metersPerUnit).toBe(0.001);
		expect(result.geojson.features[0].geometry.coordinates).toEqual([
			[0.001, 0.002, 0.003],
			[0.004, 0.005, 0.006]
		]);
	});

	it('手動指定はヘッダーの換算を置き換え、二重に倍率を掛けない', () => {
		const result = parseDxf(MILLIMETER_LINE_DXF, 'cm');
		expect(result.sourceUnitCode).toBe(4);
		expect(result.metersPerUnit).toBe(0.01);
		expect(result.geojson.features[0].geometry.coordinates).toEqual([[10, 20], [30, 40]]);
	});

	it('メッシュもXYZと色を保持したまま単位を換算する', () => {
		const result = parseDxf(POLYFACE_DXF, 'mm');
		expect(result.geojson.features[0].geometry).toMatchObject({
			type: 'MultiPolygon',
			coordinates: [
				[[[0.001, 0.002, 0.003], [0.004, 0.002, 0.003], [0.004, 0.002, 0.006], [
					0.001,
					0.002,
					0.006
				], [0.001, 0.002, 0.003]]],
				[[[0.001, 0.002, 0.003], [0.004, 0.002, 0.006], [0.001, 0.002, 0.006], [
					0.001,
					0.002,
					0.003
				]]]
			]
		});
		expect(result.geojson.features[0].properties.color).toBe('#ff0000');
	});

	it('ポリフェイスの頂点参照を面に展開し、垂直面のZを保持する', () => {
		const geojson = dxfToGeoJson(POLYFACE_DXF);
		expect(geojson.features).toHaveLength(1);
		expect(geojson.features[0].geometry).toEqual({
			type: 'MultiPolygon',
			coordinates: [
				[[[1, 2, 3], [4, 2, 3], [4, 2, 6], [1, 2, 6], [1, 2, 3]]],
				[[[1, 2, 3], [4, 2, 6], [1, 2, 6], [1, 2, 3]]]
			]
		});
		expect(geojson.features[0].properties.layer).toBe('test-mesh');
		expect(geojson.features[0].properties.color).toBe('#ff0000');
		expect(has3dGeometryForType(geojson, 'Polygon')).toBe(true);
	});

	it('範囲外の面参照を座標として混入させずエラーにする', () => {
		expect(() => dxfToGeoJson(POLYFACE_DXF.replace('72\n-2', '72\n-9')))
			.toThrow('不正な頂点参照');
	});

	it('同じ座標が重複する退化面を除き、他の面は読み込む', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const geojson = dxfToGeoJson(POLYFACE_DXF.replace('72\n3\n73\n4', '72\n1\n73\n4'));
		expect(geojson.features[0].geometry.type).toBe('MultiPolygon');
		expect(geojson.features[0].geometry.coordinates).toHaveLength(1);
		expect(warn).toHaveBeenCalledWith('Skipping degenerate DXF polyface faces', 1);
	});

	it('面レコードの0で参照を終え、三角形の不足した頂点を検出する', () => {
		expect(() => dxfToGeoJson(POLYFACE_DXF.replace('73\n3', '73\n0')))
			.toThrow('必要な頂点がありません');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('空の LWPOLYLINE はスキップして他の地物だけ返す', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const geojson = dxfToGeoJson(EMPTY_LWPOLYLINE_DXF);

		expect(geojson.features).toHaveLength(1);
		expect(geojson.features[0]?.geometry).toEqual({
			type: 'LineString',
			coordinates: [
				[0, 0],
				[10, 5]
			]
		});
		expect(geojson.features[0]?.properties?.layer).toBe('line-layer');
		expect(warnSpy).toHaveBeenCalledWith('Skipping invalid DXF entity geometry', {
			type: 'LWPOLYLINE',
			layer: 'empty-layer'
		});
	});

	it('INSUNITS が mm のときは座標を m に換算する', () => {
		const geojson = dxfToGeoJson(MILLIMETER_LINE_DXF);

		expect(geojson.features[0]?.geometry).toEqual({
			type: 'LineString',
			coordinates: [
				[1, 2],
				[3, 4]
			]
		});
	});

	it('INSUNITS が 0 のときは座標をそのまま使う', () => {
		const geojson = dxfToGeoJson(UNITLESS_LINE_DXF);

		expect(geojson.features[0]?.geometry).toEqual({
			type: 'LineString',
			coordinates: [
				[1000, 2000],
				[3000, 4000]
			]
		});
	});

	it('LINE の Z 座標を保持する', () => {
		const geojson = dxfToGeoJson(LINE_WITH_Z_DXF);

		expect(geojson.features[0]?.geometry).toEqual({
			type: 'LineString',
			coordinates: [
				[1, 2, 3],
				[4, 5, 6]
			]
		});
	});

	it('3DFACE を 3D Polygon として変換する', () => {
		const geojson = dxfToGeoJson(FACE_3D_DXF);

		expect(geojson.features[0]?.geometry).toEqual({
			type: 'Polygon',
			coordinates: [
				[
					[0, 0, 10],
					[1, 0, 11],
					[1, 1, 12],
					[0, 1, 13],
					[0, 0, 10]
				]
			]
		});
	});
});
