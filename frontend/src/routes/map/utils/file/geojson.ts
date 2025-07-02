import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { geojson as fgb } from 'flatgeobuf';
import { orderedLayerIds } from '$routes/stores/layers';
import type { MapGeoJSONFeature } from 'maplibre-gl';
import type { GeoDataEntry } from '$routes/map/data/types';
import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
import type { FeatureMenuData } from '$routes/map/types';

export type GeoJSONGeometryType =
	| 'Point'
	| 'LineString'
	| 'Polygon'
	| 'MultiPoint'
	| 'MultiPolygon'
	| 'MultiLineString';

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

/** fgbを取得してGeoJSONで返す */
export const getFgbToGeojson = async (url: string, index?: number): Promise<FeatureCollection> => {
	try {
		const response = await fetch(url);

		const featureIterator = fgb.deserialize(response.body as ReadableStream);

		const geojson: FeatureCollection = {
			type: 'FeatureCollection',
			features: []
		};

		if (index) {
			let featureIndex = 0;
			for await (const feature of featureIterator) {
				if (featureIndex === index) {
					geojson.features.push(feature);
					break;
				}
				featureIndex++;
			}
			return geojson;
		}

		for await (const feature of featureIterator) {
			geojson.features.push(feature);
		}

		return geojson;
	} catch (error) {
		console.error(error);
		throw new Error('Failed to fetch GeoJSON');
	}
};

export const mapGeoJSONFeatureToSidePopupData = (
	feature: MapGeoJSONFeature,
	point: [number, number]
): FeatureMenuData => {
	const { properties, id, layer } = feature;

	// 特定のIDに一致するか確認

	return {
		point,
		properties: properties,
		featureId: id as number,
		layerId: layer.id as string
	};
};

export const convertToGeoJSONFeature = (
	feature: MapGeoJSONFeature,
	featureId: number
): Feature | null => {
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
export const convertMapGeoJSONFeaturesToGeoJSON = (
	features: MapGeoJSONFeature[],
	featureId: number
): FeatureCollection => {
	return {
		type: 'FeatureCollection',
		// 特定のIDに一致するフィーチャーのみ変換
		features: features
			.map((feature) => convertToGeoJSONFeature(feature, featureId)) // 個別に変換
			.filter((feature): feature is Feature => feature !== null) // nullを除外
	};
};

/**
 * GeoJSONデータをダウンロードする関数
 * @param geojson ダウンロードするGeoJSONデータ (FeatureCollection形式)
 * @param filename ダウンロード時のファイル名 (デフォルト: 'data.geojson')
 */
export const downloadGeojson = (
	geojson: FeatureCollection,
	filename: string = 'data.geojson' // デフォルト値を設定
): void => {
	const geojsonString = JSON.stringify(geojson);
	const blob = new Blob([geojsonString], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.download = filename;
	a.href = url;

	a.click();
	setTimeout(() => {}, 0);
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
orderedLayerIds.subscribe((ids) => {
	// GeojsonCacheからidsに含まれていないものを削除
	for (const id of GeojsonCache.keys()) {
		if (!ids.includes(id)) {
			GeojsonCache.remove(id);
		}
	}
});

export const geoJsonFileToGeoJson = async (
	file: File
): Promise<FeatureCollection<Geometry, GeoJsonProperties>> => {
	try {
		const text = await file.text();
		const geojson = JSON.parse(text);

		// 型安全のため、FeatureCollectionかどうかを最低限チェック
		if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
			throw new Error('Invalid GeoJSON structure');
		}

		return geojson;
	} catch (error) {
		console.error('GeoJSON parsing error:', error);
		throw new Error('Failed to parse GeoJSON file');
	}
};
