import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { sxfTextToGeoJson } from './index';

const readFixture = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('sxfTextToGeoJson', () => {
	it('ISO-10303-21 ヘッダ付きの SFC を P21 と誤判定しない', () => {
		const geojson = sxfTextToGeoJson(readFixture('./sfc/__fixtures__/simple.sfc'));

		expect(geojson.features).toHaveLength(5);
		expect(geojson.features[0]?.properties).toMatchObject({
			type: 'line',
			layer: '1'
		});
	});

	it('P21 fixture は P21 として解釈する', () => {
		const geojson = sxfTextToGeoJson(readFixture('./p21/__fixtures__/simple.p21'));

		expect(geojson.features).toHaveLength(5);
		expect(geojson.features[0]?.properties?.type).toBe('polyline');
	});
});
