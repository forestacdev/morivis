import type { Coordinates, LngLat } from 'maplibre-gl';
import type { BBox as GeoJsonBBox } from 'geojson';

import {
	WEB_MERCATOR_MIN_LAT,
	WEB_MERCATOR_MAX_LAT,
	WEB_MERCATOR_MIN_LNG,
	WEB_MERCATOR_MAX_LNG
} from '$routes/map/data/entries/_meta_data/_bounds';

export type BBox = [number, number, number, number];
export type BBox3D = [number, number, number, number, number, number];

/**
 * Check if a BBox is 2D (4 elements).
 * @param bbox - The bounding box from GeoJSON.
 * @returns true if bbox is 2D [minX, minY, maxX, maxY].
 */
export const isBbox2D = (bbox: GeoJsonBBox): bbox is BBox => {
	return bbox.length === 4;
};

/**
 * Check if a BBox is 3D (6 elements).
 * @param bbox - The bounding box from GeoJSON.
 * @returns true if bbox is 3D [minX, minY, minZ, maxX, maxY, maxZ].
 */
export const isBbox3D = (bbox: GeoJsonBBox): bbox is BBox3D => {
	return bbox.length === 6;
};

/**
 * Check if a point is inside a bounding box.
 * @param point - The point as maplibregl.LngLat.
 * @param bbox - The bounding box as [minLng, minLat, maxLng, maxLat].
 * @returns true if the point is inside the bbox, false otherwise.
 */
export const isPointInBbox = (point: LngLat, bbox: BBox): boolean => {
	const [minLng, minLat, maxLng, maxLat] = bbox;

	const lng = point.lng;
	const lat = point.lat;

	return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
};

/** bbox同士が重なっているか */
export const isBBoxOverlapping = (bbox1: BBox, bbox2: BBox): boolean => {
	const [minX1, minY1, maxX1, maxY1] = bbox1;
	const [minX2, minY2, maxX2, maxY2] = bbox2;
	return minX1 < maxX2 && maxX1 > minX2 && minY1 < maxY2 && maxY1 > minY2;
};

/** bbox同士が完全に重なっているか */
export const isBBoxInside = (inner: BBox, outer: BBox): boolean => {
	const [minX1, minY1, maxX1, maxY1] = inner;
	const [minX2, minY2, maxX2, maxY2] = outer;

	return minX1 >= minX2 && maxX1 <= maxX2 && minY1 >= minY2 && maxY1 <= maxY2;
};

/**
 * Check if a bounding box is valid.
 * @param bbox - The bounding box as [minLng, minLat, maxLng, maxLat].
 * @returns true if the bbox is valid, false otherwise.
 */
export const isBboxValid = (bbox: BBox | BBox3D): boolean => {
	// 3D bboxの場合、Z軸の値を無視して2Dチェックを行う
	const bbox2d: BBox = bbox.length === 6 ? [bbox[0], bbox[1], bbox[3], bbox[4]] : bbox;
	const [minLng, minLat, maxLng, maxLat] = bbox2d;

	// 緯度が制限範囲内にあるかチェック
	const isLatitudeValid = (lat: number): boolean => {
		return lat >= WEB_MERCATOR_MIN_LAT && lat <= WEB_MERCATOR_MAX_LAT;
	};

	// 経度が制限範囲内にあるかチェック（-180 ~ 180の範囲）
	const isLongitudeValid = (lng: number): boolean => {
		return lng >= -180 && lng <= 180;
	};

	// すべての境界が有効範囲内にあるかチェック
	const minLatValid = isLatitudeValid(minLat);
	const maxLatValid = isLatitudeValid(maxLat);
	const minLngValid = isLongitudeValid(minLng);
	const maxLngValid = isLongitudeValid(maxLng);

	// bbox内で最小値が最大値より小さいかチェック
	const latOrderValid = minLat <= maxLat;
	const lngOrderValid = minLng <= maxLng;

	// NaNや無限大でないかチェック
	const isFiniteNumber = (num: number): boolean => {
		return isFinite(num) && !isNaN(num);
	};

	const allFinite = [minLng, minLat, maxLng, maxLat].every(isFiniteNumber);

	return (
		minLatValid &&
		maxLatValid &&
		minLngValid &&
		maxLngValid &&
		latOrderValid &&
		lngOrderValid &&
		allFinite
	);
};

/**
 * [minLon, minLat, maxLon, maxLat] の形式のバウンディングボックスから、
 * その4隅の座標ペアの配列 [[minLon, minLat], [maxLon, maxLat], [maxLon, minLat], [minLon, minLat]] を生成。
 * @param bbox - [最小経度, 最小緯度, 最大経度, 最大緯度] の形式の配列 (バウンディングボックス)
 * @returns バウンディングボックスの4隅の座標ペアの配列
 */
export const getBoundingBoxCorners = (bbox: BBox): Coordinates => {
	if (bbox.length !== 4) {
		throw new Error('Input array must contain exactly 4 numbers (minLon, minLat, maxLon, maxLat).');
	}

	const minLon = bbox[0];
	const minLat = bbox[1];
	const maxLon = bbox[2];
	const maxLat = bbox[3];

	// 4隅の座標を生成 (例: 左上, 右上, 右下, 左下の順)
	const corners: Coordinates = [
		[minLon, maxLat], // 左上
		[maxLon, maxLat], // 右上
		[maxLon, minLat], // 右下
		[minLon, minLat] // 左下
	];

	return corners;
};

/** bboxをポリゴンの座標に変換 */
export const bboxToPolygonCoordinates = (bbox: BBox): number[][][] => {
	return [
		[
			[bbox[0], bbox[1]],
			[bbox[2], bbox[1]],
			[bbox[2], bbox[3]],
			[bbox[0], bbox[3]],
			[bbox[0], bbox[1]]
		]
	];
};

/**
 * bboxを正規化する
 * @param bounds - The bounds as [minLng, minLat, maxLng, maxLat].
 * @returns Normalized bounds as [minLng, minLat, maxLng, maxLat].
 */
export const normalizeBounds = (bounds: BBox): BBox => {
	// 緯度をWebメルカトル（EPSG:3857）の制限範囲内にクランプする関数
	const clampLatitude = (lat: number): number => {
		return Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, lat));
	};

	// 経度を正規化する関数（-180 ~ 180の範囲に収める）
	const normalizeLongitude = (lng: number): number => {
		// 経度を-180から180の範囲に正規化
		lng = lng % 360;
		if (lng > 180) {
			lng -= 360;
		} else if (lng < -180) {
			lng += 360;
		}
		return lng;
	};

	// 緯度を制限範囲内にクランプ
	const swLat = clampLatitude(bounds[1]);
	const neLat = clampLatitude(bounds[3]);

	// 経度を正規化
	let swLng = normalizeLongitude(bounds[0]);
	let neLng = normalizeLongitude(bounds[2]);

	// 180度線をまたぐ場合の処理
	if (swLng > neLng) {
		// 地図が180度線をまたいでいる場合は、西側の境界を使用
		swLng = WEB_MERCATOR_MIN_LNG;
		neLng = WEB_MERCATOR_MAX_LNG;
	}

	return [swLng, swLat, neLng, neLat];
};
