import type { FeatureCollection } from '$routes/map/types/geojson';
import type { AnyGeometry } from '$routes/map/types/geometry';
import { FORMAT_RESOURCE_LIMITS } from '../resource-limits';

export interface MapInfoResult {
	geojson: FeatureCollection;
	sourceWkt: string;
	spatialStatus: 'resolved' | 'crs-missing';
	omittedCount: number;
}
export const MAX_TAB_FEATURES = FORMAT_RESOURCE_LIMITS['mapinfo-tab'].maxFeatures;
export const MAX_TAB_VERTICES = FORMAT_RESOURCE_LIMITS['mapinfo-tab'].maxVertices;

/** GDALの出力でも範囲外・空ジオメトリを確認し、属性だけの行数を通知する。 */
export const normalizeMapInfoGeoJson = (value: unknown, geographic: boolean) => {
	if (
		!value || typeof value !== 'object' || !('type' in value)
		|| value.type !== 'FeatureCollection' || !('features' in value)
		|| !Array.isArray(value.features)
	) throw new Error('MapInfoの変換結果が不正です');
	if (value.features.length > MAX_TAB_FEATURES) {
		throw new Error('MapInfo TABは50万地物以下にしてください');
	}
	let vertices = 0, omittedCount = 0;
	const coordinates = (value: unknown): boolean => {
		if (!Array.isArray(value) || !value.length) return false;
		if (typeof value[0] === 'number') {
			if (++vertices > MAX_TAB_VERTICES) {
				throw new Error('MapInfo TABは500万頂点以下にしてください');
			}
			if (
				value.length < 2 || !value.every(v => typeof v === 'number' && Number.isFinite(v))
			) throw new Error('MapInfoに不正な座標があります');
			if (geographic && (Math.abs(value[0]) > 180 || Math.abs(value[1]) > 90)) {
				throw new Error('変換後の座標が緯度経度の範囲外です。座標系を確認してください');
			}
			return true;
		}
		return value.map(coordinates).some(Boolean);
	};
	const geometry = (value: unknown, depth = 0): value is AnyGeometry => {
		if (value === null) return false;
		if (!value || typeof value !== 'object' || !('type' in value) || depth > 32) {
			throw new Error('MapInfoに不正な図形があります');
		}
		if (value.type === 'GeometryCollection') {
			if (!('geometries' in value) || !Array.isArray(value.geometries)) {
				throw new Error('MapInfoの複合図形が不正です');
			}
			return value.geometries.map(child => geometry(child, depth + 1)).some(Boolean);
		}
		if (
			!['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon']
				.includes(String(value.type)) || !('coordinates' in value)
		) throw new Error('MapInfoに未対応の図形があります');
		return coordinates(value.coordinates);
	};
	const features: FeatureCollection['features'] = [];
	for (const feature of value.features) {
		if (!feature || feature.type !== 'Feature') throw new Error('MapInfoの地物が不正です');
		if (!geometry(feature.geometry)) {
			omittedCount++;
			continue;
		}
		features.push({ ...feature, properties: feature.properties ?? {} });
	}
	if (!features.length) {
		throw new Error('TABに地図へ表示できる図形がありません（属性だけの表は未対応です）');
	}
	return { geojson: { type: 'FeatureCollection', features } as FeatureCollection, omittedCount };
};
