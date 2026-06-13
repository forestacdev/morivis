import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OsmParseError, osmFileToGeoJson } from '.';

const sampleOsm = readFileSync(resolve(import.meta.dirname, '__fixtures__', 'sample.osm'), 'utf8');

const createOsmFile = (text: string = sampleOsm) =>
	({
		name: 'sample.osm',
		text: async () => text
	}) as File;

afterEach(() => {
	vi.restoreAllMocks();
});

describe('osm parser', () => {
	it('OSM XML を GeoJSON に変換できる', async () => {
		const result = await osmFileToGeoJson(createOsmFile());

		expect(result.features.length).toBeGreaterThanOrEqual(2);
		expect(result.features.some((feature) => feature.geometry.type === 'Point')).toBe(true);
		expect(result.features.some((feature) => feature.geometry.type === 'LineString')).toBe(true);
		expect(result.features.find((feature) => feature.properties?.name === 'Test Node')?.properties?.amenity)
			.toBe('cafe');
	});

	it('描画可能なフィーチャが無い場合は OsmParseError を投げる', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		await expect(osmFileToGeoJson(createOsmFile('<osm version=\"0.6\"></osm>'))).rejects.toThrow(
			OsmParseError
		);
	});
});
