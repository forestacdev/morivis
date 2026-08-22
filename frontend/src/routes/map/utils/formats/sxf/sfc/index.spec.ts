import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { sxfTextToGeoJson } from './index';

const readFixture = (name: string): string =>
	readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8');

describe('sxfTextToGeoJson', () => {
	it('SFC の最小図形を GeoJSON に変換できる', () => {
		const geojson = sxfTextToGeoJson(readFixture('simple.sfc'));

		expect(geojson.features).toHaveLength(5);
		expect(geojson.features.map((feature) => feature.geometry.type)).toEqual([
			'LineString',
			'Polygon',
			'LineString',
			'LineString',
			'Point'
		]);
		expect(geojson.features[0]?.properties).toMatchObject({
			type: 'line',
			layer: '1'
		});
		expect(geojson.features[4]?.properties).toMatchObject({
			type: 'text_string',
			text: 'SXF text'
		});
	});

	it('実データのような quoted polyline を GeoJSON に変換できる', () => {
		const geojson = sxfTextToGeoJson(readFixture('quoted-polyline.sfc'));

		expect(geojson.features).toHaveLength(2);
		expect(geojson.features.map((feature) => feature.geometry.type)).toEqual([
			'Polygon',
			'LineString'
		]);
		expect(geojson.features[0]?.geometry).toMatchObject({
			type: 'Polygon'
		});
	});
});
