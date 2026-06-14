import type { FeatureCollection } from '$routes/map/types/geojson';

export class GeoRefVectorSourceCache {
	private static cache = new Map<string, FeatureCollection>();

	static set = (key: string, data: FeatureCollection): void => {
		this.cache.set(key, data);
	};

	static get = (key: string): FeatureCollection | null => {
		return this.cache.get(key) ?? null;
	};

	static remove = (key: string): void => {
		this.cache.delete(key);
	};
}
