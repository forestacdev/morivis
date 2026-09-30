import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildViteProxyConfig } from '$routes/map/utils/platform/proxy';

import {
	getNearbyPlaces,
	getObservationById,
	getTaxonById,
	searchObservations,
	searchPlaces,
	searchTaxa
} from './inaturalist';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe('iNaturalistの通信経路', () => {
	it.each([
		{ path: '/v1/taxa/autocomplete', call: () => searchTaxa('test-taxon', { limit: 1 }) },
		{ path: '/v1/taxa/1', call: () => getTaxonById(1) },
		{ path: '/v1/observations', call: () => searchObservations() },
		{ path: '/v1/observations/1', call: () => getObservationById(1) },
		{ path: '/v1/places/autocomplete', call: () => searchPlaces('test-place') },
		{ path: '/v1/places/nearby', call: () => getNearbyPlaces([0, 0, 1, 1]) }
	])('開発時の$pathがViteの同一オリジンプロキシを通る', async ({ path, call }) => {
		vi.stubEnv('PROD', false);
		const fetchMock = vi.fn(async () => Response.json({ results: [] }));
		vi.stubGlobal('fetch', fetchMock);
		await call();
		const url = String(vi.mocked(fetch).mock.calls[0][0]);
		expect(url.split('?')[0]).toBe(`/api/inaturalist${path}`);
		const proxy = buildViteProxyConfig()['/api/inaturalist'];
		expect(proxy.target).toBe('https://api.inaturalist.org');
		expect(proxy.rewrite(url)).toBe(url.replace('/api/inaturalist', ''));
	});

	it('本番は元のAPI URLへ接続し、検索条件を保持する', async () => {
		vi.stubEnv('PROD', true);
		const fetchMock = vi.fn(async () =>
			Response.json({ results: [{ id: 2, name: 'test-taxon' }] })
		);
		vi.stubGlobal('fetch', fetchMock);
		expect(await searchTaxa('test-taxon', { limit: 1 })).toEqual([{
			id: 2,
			name: 'test-taxon'
		}]);
		expect(fetch).toHaveBeenCalledWith(
			'https://api.inaturalist.org/v1/taxa/autocomplete?q=test-taxon&locale=ja&per_page=1',
			undefined
		);
	});

	it('停止中のHTMLをJSONとして解析せず、HTTPステータスを報告する', async () => {
		vi.stubEnv('PROD', false);
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				new Response('<html>test-unavailable</html>', {
					status: 503,
					statusText: 'Service Unavailable'
				})
			)
		);
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(await searchTaxa('test-taxon')).toEqual([]);
		expect(log).toHaveBeenCalledWith(
			'iNaturalist Taxa Search Error:',
			expect.objectContaining({ message: 'iNaturalist API: HTTP 503 Service Unavailable' })
		);
	});
});
