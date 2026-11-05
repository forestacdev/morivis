import { fetchWithDevProxy } from '$routes/map/utils/platform/request';
import type { FeatureCollection } from 'geojson';
import { getNativeSheetTiles, type TopographicSheetTile } from './request';

const cached = async <T>(
	cache: Map<string, Promise<T>>,
	key: string,
	limit: number,
	load: () => Promise<T>
) => {
	const existing = cache.get(key);
	if (existing) {
		cache.delete(key);
		cache.set(key, existing);
		return existing;
	}
	const result = load();
	cache.set(key, result);
	if (cache.size > limit) cache.delete(cache.keys().next().value!);
	try {
		return await result;
	} catch (error) {
		if (cache.get(key) === result) cache.delete(key);
		throw error;
	}
};

// geojsonプロトコルの寿命に合わせて通信とキャッシュを解放する。
export const createSheetDataLoader = (signal: AbortSignal) => {
	const dataCache = new Map<string, Promise<FeatureCollection>>();
	const load = (url: string) =>
		cached(dataCache, url, 96, async () => {
			const response = await fetchWithDevProxy(url, { signal });
			if (response.status === 404) {
				return { type: 'FeatureCollection', features: [] } as FeatureCollection;
			}
			if (!response.ok) {
				throw new Error(`Failed to fetch topographic sheets (${response.status}): ${url}`);
			}
			return await response.json() as FeatureCollection;
		});
	return async (tile: TopographicSheetTile): Promise<FeatureCollection> => {
		const { urls } = getNativeSheetTiles(tile);
		const collections = await Promise.all(urls.map(load));
		return {
			type: 'FeatureCollection',
			features: collections.flatMap(collection => collection.features)
		};
	};
};
