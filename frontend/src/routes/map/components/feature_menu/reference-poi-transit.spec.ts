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
		expect(getTransitPoiLinks({ ...properties, name: 'test-stop' }, [1, 2]))
			.toEqual(expect.arrayContaining([expect.objectContaining({ label: '時刻表を検索' })]));
	});

	it.each([{ subclass: 'restaurant' }, { class: 'railway', subclass: 'level_crossing' }, {}])(
		'駅・停留所以外には交通リンクを追加しない: %j',
		(properties) => {
			expect(getTransitPoiLinks(properties, [1, 2])).toBeNull();
		}
	);

	it('公式URLを優先し、検索語と経路の座標をエンコードする', () => {
		const links = getTransitPoiLinks({
			highway: 'bus_stop',
			name: 'test-stop & test-place',
			operator: 'test-operator',
			'addr:city': 'test-city',
			website: 'https://example.com/test-stop',
			'contact:website': 'https://example.com/test-contact',
			'operator:website': 'https://example.com/test-operator'
		}, [1, 2])!;
		expect(links.slice(0, 2)).toEqual([
			{ label: '公式サイト', url: 'https://example.com/test-stop' },
			{ label: '運行事業者', url: 'https://example.com/test-operator' }
		]);
		expect(new URL(links[2].url).searchParams.get('q'))
			.toBe('test-stop & test-place test-operator test-city 時刻表');
		const directions = new URL(links[3].url);
		expect(directions.searchParams.get('destination')).toBe('2,1');
		expect(directions.searchParams.get('travelmode')).toBe('transit');
	});

	it('不正なURLを除外してcontact:websiteを使い、同じ事業者URLを重複させない', () => {
		const links = getTransitPoiLinks({
			railway: 'station',
			website: 'javascript:alert(1)',
			'contact:website': 'https://example.com/test-stop',
			'operator:website': 'https://example.com/test-stop'
		}, [1, 2])!;
		expect(links.filter((link) => link.url === 'https://example.com/test-stop')).toHaveLength(
			1
		);
		expect(links.some((link) => link.url.startsWith('javascript:'))).toBe(false);
	});

	it('URL・名称・有効な座標がない場合はリンクを捏造しない', () => {
		expect(getTransitPoiLinks({
			railway: 'station',
			website: 'test-invalid-url',
			'operator:website': 'data:text/html,test'
		}, [NaN, 100])).toEqual([]);
	});
});
