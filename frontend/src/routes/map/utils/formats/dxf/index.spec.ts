import { afterEach, describe, expect, it, vi } from 'vitest';

import { dxfToGeoJson } from '.';

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

describe('dxf parser', () => {
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
});
