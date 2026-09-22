import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkOsmPoiMatch, decodePlanetilerPoiId } from './osm-poi';

describe('Planetiler POI ID', () => {
	it('地物の種類と元IDを復元する', () => {
		expect(decodePlanetilerPoiId(121)).toEqual({ type: 'node', id: 12 });
		expect(decodePlanetilerPoiId('122')).toEqual({ type: 'way', id: 12 });
		expect(decodePlanetilerPoiId(123)).toEqual({ type: 'relation', id: 12 });
	});

	it('欠落・未知の種別・精度を失ったIDでは問い合わせない', () => {
		for (
			const id of [
				undefined,
				null,
				'',
				'12x',
				'1e2',
				-120,
				4,
				120,
				124,
				12.4,
				Number.MAX_SAFE_INTEGER + 1
			]
		) {
			expect(decodePlanetilerPoiId(id)).toBeNull();
		}
	});
});

describe('OSM POI照合', () => {
	it('名称と位置が一致するnodeを照合する', () => {
		expect(checkOsmPoiMatch({ name: 'test-poi' }, [1, 2], {
			type: 'node',
			id: 12,
			lon: 1,
			lat: 2,
			tags: { name: 'test-poi' }
		})).toEqual({ status: 'match', nameMatches: true, distanceMeters: 0 });
	});

	it('同名でも離れたnodeは別の地物として扱う', () => {
		expect(
			checkOsmPoiMatch({ name: 'test-poi' }, [1, 2], {
				type: 'node',
				id: 12,
				lon: 10,
				lat: 20,
				tags: { name: 'test-poi' }
			}).status
		).toBe('mismatch');
	});

	it('種類とIDが有効でも名前が異なるwayは別の地物として扱う', () => {
		expect(
			checkOsmPoiMatch({ name: 'test-poi' }, [1, 2], {
				type: 'way',
				id: 12,
				tags: { name: 'test-other-poi' }
			}).status
		).toBe('mismatch');
	});

	it('名前も座標もない地物は確認済みにしない', () => {
		expect(
			checkOsmPoiMatch({ name: 'test-poi' }, [1, 2], {
				type: 'way',
				id: 12,
				tags: { building: 'house' }
			}).status
		).toBe('unverified');
	});
});

describe('OSM POI取得', () => {
	const fetchMock = vi.fn();
	const ref = { type: 'node', id: 12 } as const;
	const element = { ...ref, tags: { name: 'test-poi', wikidata: 'Q12' } };

	beforeEach(() => {
		vi.resetModules();
		fetchMock.mockReset();
		vi.stubGlobal('fetch', fetchMock);
	});
	afterEach(() => vi.unstubAllGlobals());

	it('同じ地物の同時取得と成功結果を共有し、タグを返す', async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify({ elements: [element] })));
		const { fetchOsmPoiElement } = await import('./osm-poi');
		const first = fetchOsmPoiElement(ref);
		expect(fetchOsmPoiElement(ref)).toBe(first);
		await expect(first).resolves.toEqual(element);
		await expect(fetchOsmPoiElement(ref)).resolves.toEqual(element);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.openstreetmap.org/api/0.6/node/12.json',
			expect.objectContaining({ signal: expect.any(AbortSignal) })
		);
	});

	it('失敗した取得は次回再試行できる', async () => {
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
		fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ elements: [element] })));
		const { fetchOsmPoiElement } = await import('./osm-poi');
		await expect(fetchOsmPoiElement(ref)).rejects.toThrow('404');
		await expect(fetchOsmPoiElement(ref)).resolves.toEqual(element);
	});

	it('別の種類やIDの地物を取得結果として扱わない', async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ elements: [{ ...element, type: 'way' }] }))
		);
		const { fetchOsmPoiElement } = await import('./osm-poi');
		await expect(fetchOsmPoiElement(ref)).rejects.toThrow('地物が見つかりません');
	});
});
