import {
	WEB_MERCATOR_MAX_LAT,
	WEB_MERCATOR_MAX_LNG,
	WEB_MERCATOR_MIN_LAT,
	WEB_MERCATOR_MIN_LNG
} from '$routes/map/data/entries/_meta_data/_bounds';

export const isValidModelPlacementLongitude = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value)
	&& value >= WEB_MERCATOR_MIN_LNG && value <= WEB_MERCATOR_MAX_LNG;

/** 極付近の無限大・巨大な座標を描画へ渡さないよう、地図の表示範囲で検証する。 */
export const isValidModelPlacementLatitude = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value)
	&& value >= WEB_MERCATOR_MIN_LAT && value <= WEB_MERCATOR_MAX_LAT;
