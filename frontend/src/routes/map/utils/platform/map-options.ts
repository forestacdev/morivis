import type { MapPosition } from '$routes/constants';
import type { Map as MapLibreMap, MapOptions } from '$routes/map/utils/maplibre';
import { resolveMapLibreRequest } from './request';

// このズーム値からホイール・トラックパッドのズーム速度を減速し始める。
const HIGH_ZOOM_START = 21;
// このズーム値で最小速度に到達する。開始値との差の間は線形に減速する。
const HIGH_ZOOM_END = 25;
// HIGH_ZOOM_END 到達時の速度倍率。0.25 は通常速度の 25% を意味する。
const MIN_ZOOM_RATE_SCALE = 0.25;
// トラックパッドの通常時ズーム速度。値を小さくすると遅くなる。
const TRACKPAD_ZOOM_RATE = 1 / 100;
// マウスホイールの通常時ズーム速度。値を小さくすると遅くなる。
const WHEEL_ZOOM_RATE = 1 / 450;
// 中クリック・Shift/Ctrl+左ドラッグによる回転量。値を小さくすると遅くなる。
export const DRAG_ROTATE_DEGREES_PER_PIXEL = 0.2;
// 中クリック・Shift/Ctrl+左ドラッグによるピッチ量。値を小さくすると遅くなる。
export const DRAG_PITCH_DEGREES_PER_PIXEL = 0.2;

export const createMapOptions = (container: HTMLElement, position: MapPosition): MapOptions => {
	return {
		...position,
		minZoom: 0,
		maxZoom: 25,
		container,
		canvasContextAttributes: {
			antialias: true,
			depth: true,
			alpha: true
		},
		centerClampedToGround: true,
		style: {
			version: 8,
			sources: {},
			layers: []
		},
		fadeDuration: 0,
		attributionControl: false,
		localIdeographFontFamily: false,
		maxPitch: 85,
		dragRotate: false,
		pitchWithRotate: false,
		boxZoom: false,
		doubleClickZoom: false,
		keyboard: false,
		transformRequest: (url, resourceType) => resolveMapLibreRequest(url, resourceType)
	};
};

export const configureProgressiveScrollZoom = (map: MapLibreMap) => {
	const updateZoomRate = () => {
		const progress = Math.min(
			Math.max((map.getZoom() - HIGH_ZOOM_START) / (HIGH_ZOOM_END - HIGH_ZOOM_START), 0),
			1
		);
		const rateScale = 1 - progress * (1 - MIN_ZOOM_RATE_SCALE);

		map.scrollZoom.setWheelZoomRate(WHEEL_ZOOM_RATE * rateScale);
		map.scrollZoom.setZoomRate(TRACKPAD_ZOOM_RATE * rateScale);
	};

	map.on('zoom', updateZoomRate);
	updateZoomRate();
};
