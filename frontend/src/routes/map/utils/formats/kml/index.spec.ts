import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getKmlDefaultColor, kmlFileToGeoJson } from '.';

const kmlText = readFileSync(resolve(import.meta.dirname, '__fixtures__', 'sample.kml'), 'utf8');

const createKmlFile = () =>
	({
		name: 'sample.kml',
		text: async () => kmlText
	}) as File;

describe('kml parser', () => {
	it('Placemark と style を GeoJSON と色情報に変換する', async () => {
		const result = await kmlFileToGeoJson(createKmlFile());

		expect(result.geojson.features).toHaveLength(1);
		expect(result.geojson.features[0]?.geometry.type).toBe('Point');
		expect(result.geojson.features[0]?.properties?.name).toBe('Sample Point');
		expect(result.geojson.features[0]?.properties?.category).toBe('survey');
		expect(result.geojson.features[0]?.properties?.['_kml_fill_color']).toBe('#ff0000');
		expect(result.geojson.features[0]?.properties?.['_kml_line_color']).toBe('#00ff00');
		expect(result.fillColors.get('sample-style')).toBe('#ff0000');
		expect(result.lineColors.get('sample-style')).toBe('#00ff00');
		expect(getKmlDefaultColor(result, 'Point')).toBe('#00ff00');
	});
});
