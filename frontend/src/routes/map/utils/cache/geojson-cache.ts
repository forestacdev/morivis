import type { FeatureCollection } from '$routes/map/types/geojson';

const downloadCachedGeojson = (geojson: FeatureCollection, filename: string): void => {
	const geojsonString = JSON.stringify(geojson);
	const blob = new Blob([geojsonString], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.download = filename;
	a.href = url;
	a.click();
	URL.revokeObjectURL(url);
};

/** GeoJSONのキャッシュを管理するクラス */
export class GeojsonCache {
	private static cache: Map<string, FeatureCollection> = new Map();

	// GeoJSONをキャッシュに保存する
	static set(key: string, data: FeatureCollection) {
		this.cache.set(key, data);
	}

	// キャッシュからGeoJSONを取得する
	static get(key: string): FeatureCollection | undefined {
		return this.cache.get(key);
	}

	// キャッシュから特定のキーを削除する
	static remove(key: string): void {
		this.cache.delete(key);
	}

	// キャッシュをすべてクリアする
	static clear(): void {
		this.cache.clear();
	}

	// キャッシュに存在するか確認する
	static has(key: string): boolean {
		return this.cache.has(key);
	}

	// キャッシュのキーを取得する
	static keys(): IterableIterator<string> {
		return this.cache.keys();
	}

	static export(key: string, filename: string): void {
		if (!this.cache.has(key)) {
			throw new Error(`Key "${key}" not found in GeojsonCache.`);
		}
		const data = this.cache.get(key);
		downloadCachedGeojson(data!, `${filename}.geojson`);
	}
}
