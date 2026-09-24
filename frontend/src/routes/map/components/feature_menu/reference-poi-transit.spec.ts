import { describe, expect, it } from 'vitest';
import { getTransitPoiLinks } from './reference-poi-transit';

describe('駅・停留所の外部リンク', () => {
	it.each([
		{ highway: 'bus_stop' },
		{ amenity: 'bus_station' },
		{ railway: 'station' },
		{ railway: 'halt' },
		{ railway: 'tram_stop' },
		{ public_transport: 'platform' },
		{ class: 'bus', subclass: 'bus_stop' },
		{ class: 'railway', subclass: 'station' },
		{ class: 'railway', subclass: 'subway' }
	])('OSMタグ・タイル分類から交通施設を判定する: %j', (properties) => {
		expect(getTransitPoiLinks({ ...properties, name: 'test-stop' }))
			.toEqual(
				expect.arrayContaining([
					expect.objectContaining({ label: '時刻表（Yahoo!路線情報）' })
				])
			);
	});

	it.each([{ subclass: 'restaurant' }, { class: 'railway', subclass: 'level_crossing' }, {}])(
		'駅・停留所以外には交通リンクを追加しない: %j',
		(properties) => {
			expect(getTransitPoiLinks(properties)).toBeNull();
		}
	);

	it.each([
		{ highway: 'bus_stop' },
		{ amenity: 'bus_station' },
		{ class: 'bus' },
		{ subclass: 'bus_stop' },
		{ subclass: 'bus_station' },
		{ public_transport: 'platform', bus: 'yes' },
		{ public_transport: 'stop_position', bus: 'yes' }
	])('バスのタグ・分類ではバス時刻表の検索結果へリンクする: %j', (properties) => {
		const links = getTransitPoiLinks({ ...properties, name: 'test-stop' })!;
		const timetable = new URL(links[0].url);
		expect(timetable.pathname).toBe('/timetable/bus');
		expect(Object.fromEntries(timetable.searchParams)).toEqual({
			page: 'srchlist',
			kind: '1',
			q: 'test-stop'
		});
	});

	it('公式URLを優先し、時刻表の検索語をエンコードする', () => {
		const links = getTransitPoiLinks({
			highway: 'bus_stop',
			name: 'test-stop & test-place',
			operator: 'test-operator',
			'addr:city': 'test-city',
			website: 'https://example.com/test-stop',
			'contact:website': 'https://example.com/test-contact',
			'operator:website': 'https://example.com/test-operator'
		})!;
		expect(links.slice(0, 2)).toEqual([
			{ label: '公式サイト', url: 'https://example.com/test-stop' },
			{ label: '運行事業者', url: 'https://example.com/test-operator' }
		]);

		const timetable = new URL(links[2].url);
		expect(timetable.origin + timetable.pathname).toBe(
			'https://transit.yahoo.co.jp/timetable/bus'
		);
		expect(Object.fromEntries(timetable.searchParams)).toEqual({
			page: 'srchlist',
			kind: '1',
			q: 'test-stop & test-place'
		});
		expect(links).toHaveLength(3);
	});

	it('日本語名を優先してYahoo!へ渡す', () => {
		const links = getTransitPoiLinks({
			railway: 'station',
			name: 'test-name',
			'name:ja': 'テスト駅 & 仮称'
		})!;
		const yahooLinks = links.filter((link) =>
			link.url.startsWith('https://transit.yahoo.co.jp/')
		);
		expect(yahooLinks).toHaveLength(1);
		const timetable = new URL(yahooLinks[0].url);
		expect(timetable.pathname).toBe('/timetable/search');
		expect(Object.fromEntries(timetable.searchParams)).toEqual({
			kind: '1',
			q: 'テスト駅 & 仮称'
		});
	});

	it('不正なURLを除外してcontact:websiteを使い、同じ事業者URLを重複させない', () => {
		const links = getTransitPoiLinks({
			railway: 'station',
			website: 'javascript:alert(1)',
			'contact:website': 'https://example.com/test-stop',
			'operator:website': 'https://example.com/test-stop'
		})!;
		expect(links.filter((link) => link.url === 'https://example.com/test-stop')).toHaveLength(
			1
		);
		expect(links.some((link) => link.url.startsWith('javascript:'))).toBe(false);
	});

	it('URL・名称がない場合はリンクを捏造しない', () => {
		expect(getTransitPoiLinks({
			railway: 'station',
			website: 'test-invalid-url',
			'operator:website': 'data:text/html,test'
		})).toEqual([]);
	});
});
