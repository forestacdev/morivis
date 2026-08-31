import type { MapPosition } from '$routes/constants';
import type { MapOptions } from '$routes/map/utils/maplibre';
import { resolveMapLibreRequest } from './request';

export const createMapInitOptions = (container: HTMLElement, position: MapPosition): MapOptions => {
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
