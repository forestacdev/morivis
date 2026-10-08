import { appendChecksumFooter } from 'nmea-simple/dist/helpers';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { parseNmea } from '.';
import cases from './__fixtures__/test-cases.json';
import { formatNmea } from './definition';

const log = (...keys: (keyof typeof cases)[]) =>
	keys.flatMap(key => cases[key]).map(line => appendChecksumFooter(`$${line}`)).join('\r\n');

describe('NMEAログ', () => {
	it('複数トーカーの文を読み、同時刻・同座標のRMCとGGAを1点に統合する', () => {
		const parsed = parseNmea(
			readFileSync(new URL('./__fixtures__/test-track.nmea', import.meta.url), 'utf8')
		);
		expect(parsed.tracks.features).toHaveLength(1);
		expect(parsed.track_points.features).toHaveLength(2);
		const first = parsed.track_points.features[0];
		expect(first.geometry).toEqual({ type: 'Point', coordinates: [2.5, 1.25] });
		expect(first.properties).toMatchObject({
			time: '2024-01-02T12:00:00.125Z',
			altitude_msl: 12.5,
			geoid_separation: 3,
			satellites: 8,
			hdop: 0.9
		});
		expect(first.properties.speed).toBeCloseTo(2 * 1852 / 3600);
		expect(parsed.unsupportedSentences).toBe(1);
	});
	it('日付も欠測高度も捏造しない', () => {
		vi.useFakeTimers();
		try {
			vi.setSystemTime(new Date('2040-06-10T01:02:03Z'));
			const result = parseNmea(log('no-date'));
			expect(result.tracks.features).toHaveLength(1);
			expect(result.track_points.features[0].properties).toMatchObject({
				time_utc: '23:59:59.500'
			});
			for (const point of result.track_points.features) {
				expect(point.properties.time).toBeUndefined();
				expect(point.properties.altitude_msl).toBeUndefined();
			}
		} finally {
			vi.useRealTimers();
		}
	});
	it('ZDAから得た日付を日付跨ぎで翌日に進める', () => {
		const points = parseNmea(log('dated-midnight')).track_points.features;
		expect(points.map(point => point.properties.time)).toEqual([
			'2024-01-31T23:59:59.500Z',
			'2024-02-01T00:00:00.500Z'
		]);
	});
	it('ZDAの時刻と前の計測時刻を混同して静止点を統合しない', () => {
		const result = parseNmea(log('stationary-zda'));
		expect(result.track_points.features).toHaveLength(2);
		expect(result.track_points.features[0].properties.time).toBeUndefined();
		expect(result.track_points.features[1].properties.time).toBe('2024-01-02T12:00:01.000Z');
	});
	it('無効測位の前後の軌跡をつながない', () => {
		const result = parseNmea(log('track', 'invalid-fix', 'next-points'));
		expect(result.invalidFixes).toBe(2);
		expect(result.tracks.features).toHaveLength(2);
		expect(result.track_points.features).toHaveLength(4);
	});
	it('チェックサム不正・欠落の位置文を除外し、軌跡を切る', () => {
		const bad = log('next-points').split('\r\n')[0].replace(/\*..$/, '*ZZ');
		const result = parseNmea(
			[log('track'), bad, bad.split('*')[0], log('next-points')].join('\n')
		);
		expect(result.skippedSentences).toBe(2);
		expect(result.tracks.features).toHaveLength(2);
	});
	it('小数点のない度分と南緯・西経をライブラリで変換する', () => {
		expect(parseNmea(log('integer-coordinates')).track_points.features[0].geometry)
			.toEqual({ type: 'Point', coordinates: [-2.5, -1.25] });
	});
	it.each(['invalid-coordinates', 'bad-date', 'bad-time'] as const)(
		'%sを位置として採用しない',
		key => {
			expect(() => parseNmea(log(key))).toThrow('有効な位置情報がありません');
		}
	);
	it('明示されたWGS84以外の測地系を誤って配置しない', () => {
		expect(() => parseNmea(log('track', 'datum'))).toThrow('WGS84以外');
	});
	it.each(['backward', 'gap'] as const)('%sで軌跡を分割する', key => {
		const result = parseNmea(log('track', key));
		expect(result.tracks.features[0].properties.point_count).toBe(2);
		expect(result.track_points.features).toHaveLength(3);
	});
	it('日付変更線を横切る大陸横断線を作らない', () => {
		const result = parseNmea(log('dateline'));
		expect(result.tracks.features).toHaveLength(0);
		expect(result.track_points.features).toHaveLength(2);
	});
	it('計測点の上限を超えた入力は途中結果を返さず停止する', () => {
		const original = formatNmea.limits.maxSourcePoints;
		Object.assign(formatNmea.limits, { maxSourcePoints: 1 });
		try {
			expect(() => parseNmea(log('track'))).toThrow('25万件');
		} finally {
			Object.assign(formatNmea.limits, { maxSourcePoints: original });
		}
	});
});
