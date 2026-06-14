/**
 * Format spec:
 * - https://datatracker.ietf.org/doc/html/rfc7946
 *
 * References:
 * - https://flatgeobuf.org/
 */
import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { AnyGeometry, Geometry, GeometryCollection } from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';
import { geojson as fgb } from 'flatgeobuf';

import type { FeatureMenuData } from '$routes/map/types';
import type { DrawGeojsonData } from '$routes/map/types/draw';
import { fetchWithDevProxy } from '$routes/map/utils/platform/request';
import type { MapGeoJSONFeature } from 'maplibre-gl';

export class GeoJsonParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'GeoJsonParseError';
	}
}

/** GeoJSONを取得する */
export const getGeojson = async (url: string): Promise<FeatureCollection> => {
	try {
		const response = await fetchWithDevProxy(url);
		const geojson = await response.json();
		return normalizeGeoJsonGeometryCollections(geojson);
	} catch (error) {
		console.error(error);
		throw new Error('Failed to fetch GeoJSON');
	}
};

type FeatureWithGeometryCollection = Omit<Feature<AnyGeometry>, 'geometry'> & {
	geometry: Geometry;
};

type FeatureCollectionWithGeometryCollection = {
	type: 'FeatureCollection';
	features: FeatureWithGeometryCollection[];
};

type SingleFeatureWithGeometryCollection = {
	type: 'Feature';
	id?: string | number;
	geometry: Geometry;
	properties?: FeatureProp | null;
};

type RootGeoJsonWithGeometryCollection =
	| FeatureCollectionWithGeometryCollection
	| SingleFeatureWithGeometryCollection
	| Geometry;

const isGeometryCollection = (
	geometry: Geometry | null | undefined
): geometry is GeometryCollection => {
	return geometry?.type === 'GeometryCollection';
};

const toFeatureCollection = (
	geojson: RootGeoJsonWithGeometryCollection
): FeatureCollectionWithGeometryCollection => {
	if (geojson.type === 'FeatureCollection') {
		return geojson;
	}

	if (geojson.type === 'Feature') {
		return {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					id: geojson.id,
					geometry: geojson.geometry,
					properties: geojson.properties ?? {}
				}
			]
		};
	}

	return {
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				geometry: geojson,
				properties: {}
			}
		]
	};
};

export const normalizeGeoJsonGeometryCollections = (
	geojson: RootGeoJsonWithGeometryCollection
): FeatureCollection => {
	const featureCollection = toFeatureCollection(geojson);

	return {
		type: 'FeatureCollection',
		features: featureCollection.features.flatMap((feature): Feature[] => {
			if (!isGeometryCollection(feature.geometry)) {
				return [feature as Feature];
			}

			return feature.geometry.geometries.map(
				(geometry, index): Feature => ({
					...feature,
					id: feature.id != null
						? `${String(feature.id)}_${index}`
						: `${crypto.randomUUID()}_${index}`,
					geometry: geometry as AnyGeometry
				})
			);
		})
	};
};

/** fgbを取得してGeoJSONで返す */
export const getFgbToGeojson = async (url: string, index?: number): Promise<FeatureCollection> => {
	try {
		const response = await fetchWithDevProxy(url);

		const featureIterator = fgb.deserialize(response.body as ReadableStream);

		const geojson: FeatureCollection = {
			type: 'FeatureCollection',
			features: []
		};

		if (index) {
			let featureIndex = 0;
			for await (const feature of featureIterator) {
				if (featureIndex === index) {
					geojson.features.push(feature as Feature);
					break;
				}
				featureIndex++;
			}
			return geojson;
		}

		for await (const feature of featureIterator) {
			geojson.features.push(feature as Feature);
		}

		return geojson;
	} catch (error) {
		console.error(error);
		throw new Error('Failed to fetch GeoJSON');
	}
};

export const mapGeoJSONFeatureToSidePopupData = (
	feature: MapGeoJSONFeature,
	point: [number, number],
	layerIdOverride?: string
): FeatureMenuData => {
	const { properties, id, layer } = feature;

	// 特定のIDに一致するか確認

	return {
		point,
		properties: properties,
		featureId: id as number,
		layerId: layerIdOverride ?? (layer.id as string)
	};
};

export const convertToGeoJSONFeature = (
	feature: MapGeoJSONFeature,
	featureId: number
): Feature | null => {
	const { geometry, properties, id } = feature;

	if (geometry.type !== 'GeometryCollection') {
		if (id === featureId) {
			// 特定のIDに一致するか確認
			return {
				type: 'Feature',
				geometry: geometry as AnyGeometry,
				properties: properties,
				id: id
			};
		}
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
	geojson: FeatureCollection | DrawGeojsonData,
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

export const geoJsonFileToGeoJson = async (file: File): Promise<FeatureCollection> => {
	try {
		const text = await file.text();
		return geoJsonTextToGeoJson(text);
	} catch (error) {
		console.error('GeoJSON parsing error:', error);
		if (error instanceof GeoJsonParseError) {
			throw error;
		}
		if (error instanceof SyntaxError) {
			throw new GeoJsonParseError('GeoJSONのJSON構文が壊れています');
		}
		throw new GeoJsonParseError('GeoJSONファイルの読み込みに失敗しました');
	}
};

export const geoJsonTextToGeoJson = (text: string): FeatureCollection => {
	try {
		const geojson = JSON.parse(text) as RootGeoJsonWithGeometryCollection;

		if (!geojson || typeof geojson !== 'object' || typeof geojson.type !== 'string') {
			throw new GeoJsonParseError('GeoJSONの構造が不正です');
		}

		return normalizeGeoJsonGeometryCollections(geojson);
	} catch (error) {
		if (error instanceof GeoJsonParseError) {
			throw error;
		}
		if (error instanceof SyntaxError) {
			throw new GeoJsonParseError('GeoJSONのJSON構文が壊れています');
		}
		throw new GeoJsonParseError('GeoJSONの読み込みに失敗しました');
	}
};
