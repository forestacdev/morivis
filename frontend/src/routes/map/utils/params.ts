import { MAP_POSITION, type MapPosition } from '$map/constants';

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
	const params = new URLSearchParams(location.search);

	if (!params.has('c') || !params.has('z') || !params.has('p') || !params.has('b')) {
		return MAP_POSITION;
	}

	const center = params.get('c')?.split(',').map(Number) as [number, number];
	const zoom = Number(params.get('z'));
	const pitch = Number(params.get('p'));
	const bearing = Number(params.get('b'));
	return {
		center,
		zoom,
		pitch,
		bearing
	};
};

/** 地図表示のURLパラメータのセット */
export const setMapParams = (option: MapPosition) => {
	const params = new URLSearchParams(location.search); // 現在のURLパラメータを取得
	const center = option.center.map((value) => value.toFixed(6));
	params.set('c', center.join(','));
	params.set('z', option.zoom.toFixed(1));
	params.set('p', option.pitch.toFixed(0));
	params.set('b', option.bearing.toFixed(0));
	history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
};

/** street view用のURLパラメータのセット */
export const setStreetViewParams = (imageId: string) => {
	const params = new URLSearchParams(location.search); // 現在のURLパラメータを取得
	params.set('imageId', imageId);
	history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
};

/** street view用のURLパラメータの取得 */
export const getStreetViewParams = (): string | null => {
	const params = new URLSearchParams(location.search);
	if (!params.has('imageId')) {
		return null;
	}
	return params.get('imageId') as string;
};
