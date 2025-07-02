import { MAP_POSITION, type MapPosition } from '$routes/constants';

import { queryParameters, ssp } from 'sveltekit-search-params';
import { isStreetView, isTerrain3d } from '$routes/stores';
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
		queryParameters(
			{
				c: ssp.string(),
				z: ssp.number(),
				p: ssp.number(),
				b: ssp.number()
			},
			{ pushHistory: false }
		)
	);

	if (
		params.c === null ||
		params.c === undefined ||
		params.z === null ||
		params.z === undefined ||
		params.p === null ||
		params.p === undefined ||
		params.b === null ||
		params.b === undefined
	) {
		return MAP_POSITION;
	}
	const center = params.c.split(',').map(Number) as [number, number];
	const zoom = Number(params.z);
	const pitch = Number(params.p);
	const bearing = Number(params.b);
	return {
		center,
		zoom,
		pitch,
		bearing
	};
};

/** 地図表示のURLパラメータのセット */
export const setMapParams = (option: MapPosition) => {
	const params = get(queryParameters({}, { pushHistory: false }));

	const center = option.center.map((value) => value.toFixed(6));
	params.c = center;
	params.z = option.zoom.toFixed(1);
	params.p = option.pitch.toFixed(0);
	params.b = option.bearing.toFixed(0);

	if (!get(isStreetView)) {
		params.imageId = '-1';
	}

	if (!get(isTerrain3d)) {
		params['3d'] = '0';
	}

	queryParameters({}, { pushHistory: false }).set(params);
};

/** street view用のURLパラメータのセット */
export const setStreetViewParams = (imageId: string) => {
	const params = get(queryParameters({}));
	params.imageId = imageId;
	queryParameters({}, { pushHistory: false }).set(params);
};

/** streetview用のURLパラメータの取得 */
export const getStreetViewParams = (): string | null => {
	const params = get(queryParameters({}, { pushHistory: false }));
	return params.imageId as string;
};

/** 3d用のURLパラメータのセット */
export const set3dParams = (numString: '0' | '1') => {
	const params = get(queryParameters({}));
	params['3d'] = numString;
	queryParameters({}, { pushHistory: false }).set(params);
};

/** 3d用のURLパラメータの取得 */
export const get3dParams = (): string | null => {
	const params = get(queryParameters({}, { pushHistory: false }));
	return params['3d'] as string;
};

export const removeUrlParams = (paramName: string) => {
	const url = window.location.href;
	const urlObj = new URL(url);
	urlObj.searchParams.delete(paramName);
	window.history.replaceState({}, '', urlObj.toString());
};

/** オブジェクトをURLパラメータに変換 */
export const objectToUrlParams = (obj: Record<string, any>): string => {
	const params = new URLSearchParams();
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			const value = obj[key];
			if (Array.isArray(value)) {
				// 値が配列の場合は、キーを複数回繰り返して追加
				value.forEach((item) => {
					params.append(key, item);
				});
			} else if (value !== undefined && value !== null) {
				// 値が undefined または null でない場合のみ追加
				params.append(key, String(value));
			}
		}
	}
	return params.toString();
};
