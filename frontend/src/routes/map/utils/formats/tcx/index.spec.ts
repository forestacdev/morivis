import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkTcxFile, parseTcxText, tcxFileToGeojson } from '.';

const sampleTcx = readFileSync(resolve(import.meta.dirname, '__fixtures__', 'sample.tcx'), 'utf8');

const createTcxFile = () =>
	({
		name: 'sample.tcx',
		text: async () => sampleTcx
	}) as File;

describe('tcx parser', () => {
	it('TCX テキストから tracks と waypoints を読み出せる', () => {
		const result = parseTcxText(sampleTcx);

		expect(result.tracks).toHaveLength(1);
		expect(result.tracks[0]?.points).toHaveLength(2);
		expect(result.tracks[0]?.name).toBe('2024-01-02T03:04:05Z');
		expect(result.waypoints).toHaveLength(2);
	});

	it('GeoJSON に変換できる', async () => {
		const tracks = await tcxFileToGeojson(createTcxFile(), 'tracks');
		const trackPoints = await tcxFileToGeojson(createTcxFile(), 'track_points');
		const waypoints = await tcxFileToGeojson(createTcxFile(), 'waypoints');

		expect(tracks.features[0]?.geometry.type).toBe('LineString');
		expect(trackPoints.features).toHaveLength(2);
		expect(trackPoints.features[0]?.properties?.time).toBe('2024-01-02T12:04:05+09:00');
		expect(waypoints.features).toHaveLength(2);
		expect(waypoints.features[1]?.properties?.point_type).toBe('Right');
	});

	it('利用可能なデータ種別を判定できる', async () => {
		const result = await checkTcxFile(createTcxFile());

		expect(result).toEqual({
			tracks: true,
			track_points: true,
			waypoints: true
		});
	});
});
