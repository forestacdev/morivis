import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAX_FIT_BYTES, parseFit } from '.';

const fixture = (name: string): ArrayBuffer => {
	const bytes = readFileSync(new URL(`./__fixtures__/${name}.fit`, import.meta.url));
	return Uint8Array.from(bytes).buffer;
};

describe('FIT', () => {
	it('WGS84の座標とSI単位の計測値・UTC時刻を読み、一時停止で線を分割する', async () => {
		const result = await parseFit(fixture('test-track'));
		expect(result.track_points.features).toHaveLength(4);
		expect(result.tracks.features).toHaveLength(2);
		expect(result.tracks.features.map(feature => feature.properties.point_count)).toEqual([
			2,
			2
		]);
		const point = result.track_points.features[0];
		expect(point.geometry.type).toBe('Point');
		if (point.geometry.type !== 'Point') throw new Error('Point expected');
		expect(point.geometry.coordinates[0]).toBeCloseTo(2.5, 6);
		expect(point.geometry.coordinates[1]).toBeCloseTo(1.25, 6);
		expect(point.properties).toMatchObject({
			ele: 25,
			speed: 2.25,
			distance_meters: 12.5,
			heart_rate_bpm: 120,
			cadence: 60,
			watts: 100,
			temperature: 20,
			time: '2021-09-08T01:46:40Z'
		});
	});
	it('GPS欠落値を除外し、欠落区間を線でつながない', async () => {
		const result = await parseFit(fixture('test-gap'));
		expect(result.skippedRecords).toBe(1);
		expect(result.track_points.features).toHaveLength(4);
		expect(result.tracks.features).toHaveLength(2);
	});
	it('12バイトヘッダーと単独の0度の地点を読み込む', async () => {
		const result = await parseFit(fixture('test-single'));
		expect(result.tracks.features).toHaveLength(0);
		expect(result.track_points.features[0].geometry).toEqual({
			type: 'Point',
			coordinates: [0, 0]
		});
	});
	it('コースポイントの名称・方向・距離を読み込む', async () => {
		const result = await parseFit(fixture('test-course'));
		expect(result.waypoints.features[0].properties).toMatchObject({
			name: 'test-turn',
			point_type: 'left',
			distance_meters: 50
		});
	});
	it('big endian、未知developer field、圧縮時刻の繰り上がりを読める', async () => {
		const result = await parseFit(fixture('test-compressed'));
		expect(result.track_points.features).toHaveLength(2);
		expect(result.track_points.features[1].properties.time).toBe('2021-09-08T01:47:12Z');
		const point = result.track_points.features[1];
		if (point.geometry.type !== 'Point') throw new Error('Point expected');
		expect(point.geometry.coordinates[0]).toBeCloseTo(-2.75, 6);
	});
	it('GPSのない記録には理由を返す', async () => {
		await expect(parseFit(fixture('test-no-gps'))).rejects.toThrow('位置情報がありません');
	});
	it('破損・途切れたFIT、別形式を拒否する', async () => {
		const corrupt = fixture('test-track');
		new Uint8Array(corrupt)[corrupt.byteLength - 1] ^= 1;
		await expect(parseFit(corrupt)).rejects.toThrow('破損・欠落');
		await expect(parseFit(fixture('test-track').slice(0, 25))).rejects.toThrow('破損・欠落');
		await expect(parseFit(new TextEncoder().encode('test-not-fit').buffer)).rejects.toThrow(
			'ファイル形式'
		);
	});
	it('サイズ上限を解析前に検証する', async () => {
		await expect(parseFit(new ArrayBuffer(MAX_FIT_BYTES + 1))).rejects.toThrow('64 MiB');
	});
});
