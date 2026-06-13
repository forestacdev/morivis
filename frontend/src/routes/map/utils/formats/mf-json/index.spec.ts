import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { inspectMfJsonFile, isMfJsonFile, isMfJsonText, mfJsonFileToGeojson } from '.';

const sampleJson = readFileSync(resolve(import.meta.dirname, '__fixtures__', 'sample.json'), 'utf8');

const createFile = () =>
	({
		name: 'sample.mf.json',
		text: async () => sampleJson
	}) as File;

describe('mf-json parser', () => {
	it('MF-JSON 形式を判定できる', async () => {
		expect(isMfJsonText(sampleJson)).toBe(true);
		await expect(isMfJsonFile(createFile())).resolves.toBe(true);
	});

	it('時系列サマリを集計できる', async () => {
		const result = await inspectMfJsonFile(createFile());

		expect(result).toEqual({
			geometryType: 'Trajectory',
			trackCount: 1,
			pointCount: 2,
			polygonCount: 0,
			timestamps: ['2024-01-02T12:04:05+09:00', '2024-01-02T12:09:05+09:00']
		});
	});

	it('tracks と track_points を GeoJSON に変換できる', async () => {
		const tracks = await mfJsonFileToGeojson(createFile(), 'tracks');
		const points = await mfJsonFileToGeojson(createFile(), 'track_points');

		expect(tracks.features[0]?.geometry.type).toBe('LineString');
		expect(tracks.features[0]?.properties?.point_count).toBe(2);
		expect(points.features).toHaveLength(2);
		expect(points.features[0]?.properties?.speed).toBe(1.2);
	});
});
