import { MAP_POSITION, type MapPosition } from '$map/constants';
import { page } from '$app/state';
import { replaceState } from '$app/navigation';

import { queryParameters, ssp } from 'sveltekit-search-params';
import { get } from 'svelte/store';

/* urlパラメーターの取得 **/
export const getParams = (params: string): { [key: string]: string } => {
	const paramsArray = params.slice(1).split('&');
	const paramsObject: { [key: string]: string } = {};
	paramsArray.forEach((param) => {
		paramsObject[param.split('=')[0]] = param.split('=')[1];
	});
	return paramsObject;
};

/** 地図表示用のURLパラメータの取得 */
export const getMapParams = (): MapPosition => {
	const params = get(
		queryParameters({
			c: ssp.array(),
			z: ssp.number(),
			p: ssp.number(),
			d: ssp.number()
		})
	);
	if (!params.c || !params.z || !params.p || !params.d) {
		return MAP_POSITION;
	}

	const center = params.c.map((value) => Number(value)) as [number, number];
	const zoom = Number(params.z);
	const pitch = Number(params.p);
	const bearing = Number(params.d);
	return {
		center,
		zoom,
		pitch,
		bearing
	};
};

/** 地図表示のURLパラメータのセット */
export const setMapParams = (option: MapPosition) => {
	const params = get(queryParameters({}));
	const url = new URL(page.url);
	// NOTE: ページ遷移時にmoveendで書き込めるのを防ぐ
	if (url.pathname !== '/map') return;
	const center = option.center.map((value) => value.toFixed(6));
	params.c = center;
	params.z = option.zoom.toFixed(1);
	params.p = option.pitch.toFixed(0);
	params.d = option.bearing.toFixed(0);
	queryParameters().set(params);
};

/** street view用のURLパラメータのセット */
export const setStreetViewParams = (imageId: string) => {
	const params = get(queryParameters({}));
	params.imageId = imageId;
	queryParameters().set(params);
};

/** street view用のURLパラメータの取得 */
export const getStreetViewParams = (): string | null => {
	const params = get(queryParameters({}));
	return params.imageId as string;
};
