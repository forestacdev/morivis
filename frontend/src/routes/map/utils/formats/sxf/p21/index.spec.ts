import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { p21TextToGeoJson } from './index';

const readFixture = (name: string): string =>
	readFileSync(resolve(__dirname, '__fixtures__', name), 'utf8');

describe('p21TextToGeoJson', () => {
	it('synthetic P21 fixture を GeoJSON に変換できる', () => {
		const geojson = p21TextToGeoJson(readFixture('simple.p21'));

		expect(geojson.features).toHaveLength(5);

		const polygon = geojson.features.find((feature) => feature.id === '120');
		expect(polygon?.geometry.type).toBe('Polygon');
		expect(polygon?.properties).toMatchObject({
			type: 'polyline',
			layer: 'L-POLY',
			color: '#ff0000',
			lineType: 'continuous',
			lineWidth: 0.5,
			closed: true
		});

		const trimmedLine = geojson.features.find((feature) => feature.id === '190');
		expect(trimmedLine?.geometry.type).toBe('LineString');
		expect(trimmedLine?.geometry.coordinates).toEqual([
			[20, 0],
			[30, 5]
		]);

		const circle = geojson.features.find((feature) => feature.id === '230');
		expect(circle?.geometry.type).toBe('LineString');
		expect(circle?.properties).toMatchObject({
			type: 'circle',
			layer: 'L-CIRCLE',
			radius: 3
		});

		const arc = geojson.features.find((feature) => feature.id === '300');
		expect(arc?.geometry.type).toBe('LineString');
		expect(arc?.properties).toMatchObject({
			type: 'arc',
			layer: 'L-CIRCLE',
			radius: 3
		});

		const text = geojson.features.find((feature) => feature.id === '390');
		expect(text?.geometry.type).toBe('Point');
		expect(text?.properties).toMatchObject({
			type: 'text_literal',
			layer: 'L-TEXT',
			text: 'Hello P21',
			font: 'TestFont',
			textHeight: 2.5,
			textSpacing: 0.25
		});
		expect(text?.properties?.textRotation).toBeCloseTo(90);
	});
});
