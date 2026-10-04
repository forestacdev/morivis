import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseAis } from '.';
import { checksum, position, sentence, static24, static5, tag } from './__fixtures__/encode';
import { formatAis } from './definition';
import { isAisFile } from './files';
import { parseAisSentence } from './sentence';

describe('AISログ', () => {
	it('架空のClass A/B位置、MMSI、船名、速度を復号し船別航跡を作る', () => {
		const result = parseAis(
			readFileSync(new URL('./__fixtures__/test-vessels.ais', import.meta.url), 'utf8')
		);
		expect(result.vesselCount).toBe(2);
		expect(result.track_points.features).toHaveLength(4);
		expect(result.tracks.features).toHaveLength(2);
		expect(result.skippedSentences).toBe(0);
		expect(result.track_points.features[0]).toMatchObject({
			geometry: { coordinates: [2, 1] },
			properties: {
				mmsi: '999000001',
				name: 'TEST-VESSEL',
				speed: 5,
				course: 90,
				heading: 90,
				destination: 'TEST-PORT',
				time: '2024-01-02T00:00:00.000Z'
			}
		});
		expect(result.track_points.features[1].properties).toMatchObject({
			name: 'TEST-BOAT',
			callsign: 'TEST-B'
		});
		expect(result.tracks.features[0].properties).not.toHaveProperty('time');
	});
	it.each([1, 2, 3, 18])('位置報告タイプ%dと負の経緯度を扱う', type => {
		const result = parseAis(position({ type, lon: -2, lat: -1 }));
		expect(result.track_points.features[0].geometry).toMatchObject({ coordinates: [-2, -1] });
		expect(result.untimedPoints).toBe(1);
		expect(result.track_points.features[0].properties).not.toHaveProperty('time');
	});
	it('不正チェックサム・短いペイロード・不正な埋め草を除外する', () => {
		const p = position();
		const invalid = p.slice(0, -2) + (p.endsWith('00') ? '01' : '00');
		const result = parseAis(
			[invalid, sentence('1'), sentence('1'.repeat(28), 1), p].join('\n')
		);
		expect(result.skippedSentences).toBe(3);
		expect(result.track_points.features).toHaveLength(1);
	});
	it('欠測位置を除外し、その前後の航跡をつながない', () => {
		const result = parseAis(
			[position(), position({ lon: 181, lat: 91 }), position({ lon: 3 })].join('\n')
		);
		expect(result.invalidPositions).toBe(1);
		expect(result.tracks.features).toHaveLength(0);
		const point =
			parseAis(position({ speed: 1023, course: 3600, heading: 511, second: 63 })).track_points
				.features[0];
		for (const key of ['speed', 'course', 'heading', 'utc_second']) {
			expect(point.properties).not.toHaveProperty(key);
		}
	});
	it('MMSI・チャネル・受信局を混ぜず分割メッセージを組み立てる', () => {
		const a = static5(), b = static5(999000002, 'TEST-SECOND', '1', 'B');
		const result = parseAis(
			[a[0], b[1], a[1], b[0], position(), position({ mmsi: 999000002 })].join('\n')
		);
		expect(result.incompleteMessages).toBe(0);
		expect(result.track_points.features.map(f => f.properties.name)).toEqual([
			'TEST-VESSEL',
			'TEST-SECOND'
		]);
		const c = static5(999000003, 'TEST-THIRD');
		const tagged = parseAis(
			[
				tag('s:test-a', a[0]),
				tag('s:test-b', c[0]),
				tag('s:test-a', a[1]),
				tag('s:test-b', c[1]),
				position(),
				position({ mmsi: 999000003 })
			].join('\n')
		);
		expect(tagged.track_points.features.map(f => f.properties.name)).toEqual([
			'TEST-VESSEL',
			'TEST-THIRD'
		]);
	});
	it('IDなし分割・未完了・重複・順序違いを処理する', () => {
		const parts = static5(999000001, 'TEST-VESSEL', '');
		expect(parseAis([...parts, position()].join('\n')).track_points.features[0].properties.name)
			.toBe('TEST-VESSEL');
		expect(parseAis([parts[1], parts[0], position()].join('\n')).incompleteMessages).toBe(2);
		expect(parseAis([parts[0], parts[0], parts[1], position()].join('\n')).incompleteMessages)
			.toBe(1);
	});
	it('Class Bの24A/Bを同じ船舶へ付加する', () => {
		const result = parseAis(
			[static24(1), position({ type: 18, mmsi: 999000002 }), static24(0)].join('\n')
		);
		expect(result.track_points.features[0].properties).toMatchObject({
			name: 'TEST-BOAT',
			callsign: 'TEST-B',
			ship_type: 37
		});
	});
	it('ISO受信時刻とタグのUnix秒・ミリ秒を扱い、AIS秒だけでは日時を作らない', () => {
		const p = position({ second: 15 });
		const result = parseAis(
			[
				`2024-01-02T09:00:00+09:00 ${p}`,
				tag('c:1704153600.5', p),
				tag('c:1704153601000', p),
				p
			].join('\n')
		);
		expect(result.track_points.features.map(f => f.properties.time)).toEqual([
			'2024-01-02T00:00:00.000Z',
			'2024-01-02T00:00:00.500Z',
			'2024-01-02T00:00:01.000Z',
			undefined
		]);
		expect(parseAisSentence(`2024-02-30T00:00:00Z ${p}`)?.time).toBeUndefined();
		expect(parseAis('\\c:1704153600*00\\' + p).skippedSentences).toBe(1);
	});
	it('30分超の間隔・日時逆転・日時有無・日付変更線・受信局変更で航跡を区切る', () => {
		const result = parseAis([
			`2024-01-02T01:00:00Z ${position()}`,
			`2024-01-02T02:00:00Z ${position()}`,
			`2024-01-02T00:00:00Z ${position()}`,
			position(),
			position({ lon: 179 }),
			position({ lon: -179 }),
			tag('s:test-b', position())
		].join('\n'));
		expect(result.tracks.features).toHaveLength(1);
		expect(result.tracks.features[0].properties.point_count).toBe(2);
	});
	it('通常NMEAや非位置AISを無視し、専用拡張子と内容を判定する', async () => {
		expect(parseAis(position({ type: 4 })).unsupportedMessages).toBe(1);
		expect(() => parseAis('$GPRMC,test')).toThrow('見つかりません');
		for (const extension of ['ais', 'nmea', 'nme', 'log', 'txt']) {
			expect(await isAisFile(new File([position()], `test.${extension}`))).toBe(true);
		}
		expect(await isAisFile(new File(['$GPRMC,test'], 'test.nmea'))).toBe(false);
		expect(await isAisFile(new File(['1 2 3'], 'test.txt'))).toBe(false);
		expect(() => parseAis(' '.repeat(formatAis.limits.maxTextLength + 1))).toThrow('32 MiB');
	});
	it('AIVDO、BOM、CRLFとタグの断片グループを扱う', () => {
		const own = position().replace('AIVDM', 'AIVDO').split('*')[0];
		expect(
			parseAis('\uFEFF' + own + '*' + checksum(own.slice(1)) + '\r\n').track_points
				.features[0].properties.sentence
		).toBe('AIVDO');
		const parts = static5(999000001, 'TEST-VESSEL', '');
		const result = parseAis(
			[tag('g:2-2-test-group', parts[1]), tag('g:1-2-test-group', parts[0]), position()].join(
				'\n'
			)
		);
		expect(result.track_points.features[0].properties.name).toBe('TEST-VESSEL');
	});
});
