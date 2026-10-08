import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { inspectOrbit, orbitUtcTime, propagateOrbit } from '.';
import { formatOrbit } from './definition';
import { isOrbitFile } from './files';

const fixture = (name: string) =>
	readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8');
const tle = fixture('test-orbit.tle'), omm = fixture('test-orbit.json');
const options = inspectOrbit(omm).defaultOptions;
const checksum = (line: string) =>
	line.slice(0, 68)
	+ [...line.slice(0, 68)].reduce((n, c) => n + (/\d/.test(c) ? Number(c) : c === '-' ? 1 : 0), 0)
		% 10;

describe('TLE / OMM', () => {
	it('同じ架空軌道のTLEとOMMから同じ時刻・経緯度・高度を得る', () => {
		const a = propagateOrbit(tle, options), b = propagateOrbit(omm, options);
		expect(a.timestamps).toEqual(b.timestamps);
		expect(a.points.features).toHaveLength(121);
		for (const [i, point] of a.points.features.entries()) {
			expect(point.geometry).toEqual(b.points.features[i].geometry);
			expect(point.properties.height).toBeCloseTo(
				Number(b.points.features[i].properties.height),
				3
			);
			expect(Number(point.properties.height)).toBeGreaterThan(100000);
			expect(Number(point.properties.height)).toBeLessThan(2000000);
		}
		expect(a.points.features[0].geometry).not.toEqual(a.points.features[1].geometry);
	});
	it('2行TLE、0接頭辞付き名称、BOM・CRLFを読み込める', () => {
		const lines = tle.trim().split('\n');
		expect(inspectOrbit(lines.slice(1).join('\n')).satellites[0].name).toBe('99999');
		expect(inspectOrbit('\uFEFF0 ' + lines.join('\r\n')).satellites[0].name).toBe('TEST-ORBIT');
	});
	it('チェックサム、衛星番号、欠けた行、日付の範囲を検証する', () => {
		const lines = tle.trim().split('\n');
		expect(() =>
			inspectOrbit(
				[lines[0], lines[1].slice(0, 68) + ((Number(lines[1][68]) + 1) % 10), lines[2]]
					.join('\n')
			)
		).toThrow('チェックサム');
		expect(() =>
			inspectOrbit([lines[1], checksum(lines[2].replace('99999', '99998'))].join('\n'))
		).toThrow('衛星番号');
		expect(() => inspectOrbit(lines[1])).toThrow('揃えて');
		expect(() =>
			inspectOrbit([checksum(lines[1].replace('24002.', '24999.')), lines[2]].join('\n'))
		).toThrow('epoch day');
	});
	it('OMMの数値文字列と複数衛星を処理する', () => {
		const value = JSON.parse(omm);
		for (const key of Object.keys(value)) {
			if (typeof value[key] === 'number') value[key] = String(value[key]);
		}
		expect(propagateOrbit(JSON.stringify(value), options).points.features).toEqual(
			propagateOrbit(omm, options).points.features
		);
		const result = propagateOrbit(fixture('test-orbits.json'), options);
		expect(result.points.features).toHaveLength(242);
		expect(new Set(result.points.features.map(f => f.properties.satellite_id)).size).toBe(2);
	});
	it.each([
		['ECCENTRICITY', 1],
		['INCLINATION', 181],
		['MEAN_MOTION', 0],
		['BSTAR', null],
		['TIME_SYSTEM', 'TAI'],
		['REF_FRAME', 'ICRF'],
		['CENTER_NAME', 'MARS'],
		['MEAN_ELEMENT_THEORY', 'OTHER'],
		['EPHEMERIS_TYPE', 4],
		['CCSDS_OMM_VERS', '9.0'],
		['EPOCH', '2024-02-30T00:00:00']
	])('不正または未対応のOMM %sを拒否する', (key, value) => {
		expect(() => inspectOrbit(JSON.stringify({ ...JSON.parse(omm), [key]: value }))).toThrow();
	});
	it('重複衛星、空入力、未対応エンコードと入力上限を検証する', () => {
		expect(() => inspectOrbit(JSON.stringify([JSON.parse(omm), JSON.parse(omm)]))).toThrow(
			'重複'
		);
		expect(() => inspectOrbit('[]')).toThrow('ありません');
		expect(() => inspectOrbit('<omm/>')).toThrow('JSON形式');
		expect(() => inspectOrbit(' '.repeat(formatOrbit.limits.maxTextLength + 1))).toThrow(
			'8 MiB'
		);
	});
	it('期間・計算間隔・計算点数を制限する', () => {
		expect(() => propagateOrbit(omm, { ...options, end: options.start })).toThrow('終了時刻');
		expect(() => propagateOrbit(omm, { ...options, end: '2024-01-10T00:00:00Z' })).toThrow(
			'7日'
		);
		for (const stepSeconds of [0, -1, 0.5, NaN, Infinity, 86401]) {
			expect(() => propagateOrbit(omm, { ...options, stepSeconds })).toThrow('計算間隔');
		}
		expect(() =>
			propagateOrbit(omm, { ...options, end: '2024-01-05T00:00:00Z', stepSeconds: 1 })
		).toThrow('20万点');
	});
	it('刻みで割り切れない終了時刻も含め、日付変更線では軌跡を分割する', () => {
		const result = propagateOrbit(tle, { ...options, end: '2024-01-02T02:00:01Z' });
		expect(result.timestamps).toHaveLength(122);
		expect(result.timestamps.at(-1)).toBe('2024-01-02T02:00:01.000Z');
		expect(result.tracks.features.length).toBeGreaterThan(1);
		for (const feature of result.tracks.features) {
			if (feature.geometry.type !== 'LineString') throw new Error('Expected line');
			for (let i = 1; i < feature.geometry.coordinates.length; i++) {
				expect(
					Math.abs(
						feature.geometry.coordinates[i][0] - feature.geometry.coordinates[i - 1][0]
					)
				).toBeLessThanOrEqual(180);
			}
		}
	});
	it('基準時刻はUTCとして扱い、古い軌道要素の計算を通知する', () => {
		expect(orbitUtcTime('2024-01-02T00:00:00')).toBe(Date.UTC(2024, 0, 2));
		expect(() => orbitUtcTime('2024-01-02T00:00:00+09:00')).toThrow('UTC');
		expect(
			propagateOrbit(omm, {
				...options,
				start: '2024-02-02T00:00:00Z',
				end: '2024-02-02T01:00:00Z'
			}).warnings
		).toHaveLength(1);
	});
	it('内容判定で通常のJSONやTXTを奪わない', async () => {
		expect(await isOrbitFile(new File([tle], 'test.txt'))).toBe(true);
		expect(await isOrbitFile(new File([omm], 'test.json'))).toBe(true);
		expect(
			await isOrbitFile(new File(['{"type":"FeatureCollection","features":[]}'], 'test.json'))
		).toBe(false);
		expect(await isOrbitFile(new File(['1 2 3\n4 5 6'], 'test.txt'))).toBe(false);
	});
});
