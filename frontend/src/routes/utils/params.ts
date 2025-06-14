import { MAP_POSITION, type MapPosition } from '$routes/constants';

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
	queryParameters({}, { pushHistory: false }).set(params);
};

/** street view用のURLパラメータのセット */
export const setStreetViewParams = (imageId: string) => {
	const params = get(queryParameters({}));
	params.imageId = imageId;
	queryParameters({}, { pushHistory: false }).set(params);
};

/** street view用のURLパラメータの取得 */
export const getStreetViewParams = (): string | null => {
	const params = get(queryParameters({}, { pushHistory: false }));
	return params.imageId as string;
};

export const removeStreetViewParams = () => {
	const params = get(queryParameters({}, { pushHistory: false }));
	if (params.imageId) {
		delete params.imageId;
		console.log(params);
		queryParameters({}, { pushHistory: false }).set(params);
	}
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
