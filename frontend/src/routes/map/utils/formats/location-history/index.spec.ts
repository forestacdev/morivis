import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	inspectLocationHistoryFile,
	isLocationHistoryFile,
	isLocationHistoryText,
	locationHistoryFileToGeojson
} from '.';

const sampleJson = readFileSync(
	resolve(import.meta.dirname, '__fixtures__', 'sample.json'),
	'utf8'
);

const createFile = () =>
	({
		name: 'location-history.json',
		text: async () => sampleJson
	}) as File;

describe('location-history parser', () => {
	it('Location History 形式を判定できる', async () => {
		expect(isLocationHistoryText(sampleJson)).toBe(true);
		await expect(isLocationHistoryFile(createFile())).resolves.toBe(true);
	});

	it('サマリを集計できる', async () => {
		const result = await inspectLocationHistoryFile(createFile());

		expect(result).toEqual({
			visitCount: 1,
			activityCount: 1,
			timelineSegmentCount: 1,
			timelinePointCount: 2
		});
	});

	it('各データ種別を GeoJSON に変換できる', async () => {
		const visits = await locationHistoryFileToGeojson(createFile(), 'visits');
		const activities = await locationHistoryFileToGeojson(createFile(), 'activities');
		const timeline = await locationHistoryFileToGeojson(createFile(), 'timeline_points');

		expect(visits.features[0]?.geometry.type).toBe('Point');
		expect(visits.features[0]?.properties?.semantic_type).toBe('home');
		expect(activities.features[0]?.geometry.type).toBe('LineString');
		expect(activities.features[0]?.properties?.activity_type).toBe('WALKING');
		expect(timeline.features).toHaveLength(2);
		expect(timeline.features[1]?.properties?.time).toBe('2024-01-02T15:10:00+09:00');
	});
});
