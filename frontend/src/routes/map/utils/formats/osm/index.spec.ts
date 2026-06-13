import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { OsmParseError, osmFileToGeoJson } from '.';

const sampleOsm = readFileSync(resolve(import.meta.dirname, '__fixtures__', 'sample.osm'), 'utf8');

const createOsmFile = (text: string = sampleOsm) =>
	({
		name: 'sample.osm',
		text: async () => text
	}) as File;

describe('osm parser', () => {
	it('OSM XML を GeoJSON に変換できる', async () => {
		const result = await osmFileToGeoJson(createOsmFile());

		expect(result.features.length).toBeGreaterThanOrEqual(2);
		expect(result.features.some((feature) => feature.geometry.type === 'Point')).toBe(true);
		expect(result.features.some((feature) => feature.geometry.type === 'LineString')).toBe(true);
		expect(result.features.find((feature) => feature.properties?.name === 'Test Node')?.properties?.amenity)
			.toBe('cafe');
	});

	it('壊れた XML では OsmParseError を投げる', async () => {
		await expect(osmFileToGeoJson(createOsmFile('<osm><node></osm'))).rejects.toThrow(OsmParseError);
	});
});
