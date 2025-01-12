import type { Feature, FeatureCollection, Geometry, GeoJsonProperties, GeoJSON } from 'geojson';
import { geojson as fgb, geojson } from 'flatgeobuf';
import { addedLayerIds } from '$map/store';
import type { MapGeoJSONFeature } from 'maplibre-gl';

export const getUniquePropertyValues = (
	geojson: FeatureCollection,
	propertyName: string
): any[] => {
	// Set を使用してユニークな値を格納
	const uniqueValues = new Set<any>();

	// 全ての地物（Feature）をループ
	geojson.features.forEach((feature: Feature<Geometry>) => {
		if (feature.properties && propertyName in feature.properties) {
			uniqueValues.add(feature.properties[propertyName]);
		}
	});

	// Set を配列に変換して返す
	return Array.from(uniqueValues);
};

/** GeoJSONを取得する */
export const getGeojson = async (url: string): Promise<FeatureCollection> => {
	try {
		const response = await fetch(url);

		return response.json();
	} catch (error) {
		console.error(error);
		throw new Error('Failed to fetch GeoJSON');
	}
};

// const fgbBoundingBox = () => {
// 	// mapStore.
// 	const bounds = mapStore.getBounds();
// 	console.log(bounds);
// 	if (!bounds) return;
// 	return bounds;
// };

/** fgbを取得してGeoJSONで返す */
export const getFgbToGeojson = async (url: string): GeoJSON.GeoJSON => {
	try {
		const response = await fetch(url);
		// const featureIterator = fgb.deserialize(response.body as ReadableStream, {
		// 	minX: 136.92278224505964,
		// 	minY: 35.5550269493974,
		// 	maxX: 136.92300017454164,
		// 	maxY: 35.555151603539045
		// });

		const featureIterator = fgb.deserialize(response.body as ReadableStream);

		const geojson: GeoJSON.GeoJSON = {
			type: 'FeatureCollection',
			features: []
		};

		for await (const feature of featureIterator) {
			geojson.features.push(feature);
		}

		return geojson;
	} catch (error) {
		console.error(error);
		throw new Error('Failed to fetch GeoJSON');
	}
};

const convertToGeoJSON = (feature: MapGeoJSONFeature, featureId: number): Feature | null => {
	const { geometry, properties, id } = feature;

	// 特定のIDに一致するか確認
	if (id === featureId) {
		return {
			type: 'Feature',
			geometry: geometry,
			properties: properties,
			id: id
		};
	}

	return null; // 条件に一致しない場合は無効な値を返す
};

/** MapGeoJSONFeature[]をgeojsonで返す */
export const convertToGeoJSONCollection = (
	features: MapGeoJSONFeature[],
	featureId: number
): FeatureCollection => {
	return {
		type: 'FeatureCollection',
		// 特定のIDに一致するフィーチャーのみ変換
		features: features
			.map((feature) => convertToGeoJSON(feature, featureId)) // 個別に変換
			.filter((feature): feature is Feature => feature !== null) // nullを除外
	};
};

/** GeoJSONのキャッシュを管理するクラス */
export class GeojsonCache {
	private static cache: Map<string, FeatureCollection<Geometry, GeoJsonProperties>> = new Map();

	// GeoJSONをキャッシュに保存する
	static set(key: string, data: FeatureCollection<Geometry, GeoJsonProperties>) {
		this.cache.set(key, data);
	}

	// キャッシュからGeoJSONを取得する
	static get(key: string): FeatureCollection<Geometry, GeoJsonProperties> | undefined {
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
}

// レイヤーメニューから削除されたgeojsonデータを削除
addedLayerIds.subscribe((ids) => {
	// GeojsonCacheからidsに含まれていないものを削除
	for (const id of GeojsonCache.keys()) {
		if (!ids.includes(id)) {
			GeojsonCache.remove(id);
		}
	}
});
