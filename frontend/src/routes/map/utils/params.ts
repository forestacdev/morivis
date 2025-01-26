import { MAP_POSITION, type MapPosition } from '$map/constants';
import { page } from '$app/state';
import { replaceState } from '$app/navigation';

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
	const url = new URL(page.url);

	if (
		!url.searchParams.has('c') ||
		!url.searchParams.has('z') ||
		!url.searchParams.has('p') ||
		!url.searchParams.has('b')
	) {
		return MAP_POSITION;
	}

	const center = url.searchParams.get('c')?.split(',').map(Number) as [number, number];
	const zoom = Number(url.searchParams.get('z'));
	const pitch = Number(url.searchParams.get('p'));
	const bearing = Number(url.searchParams.get('b'));
	return {
		center,
		zoom,
		pitch,
		bearing
	};
};

/** 地図表示のURLパラメータのセット */
export const setMapParams = (option: MapPosition) => {
	const url = new URL(page.url);
	const center = option.center.map((value) => value.toFixed(6));
	url.searchParams.set('c', center.join(','));
	url.searchParams.set('z', option.zoom.toFixed(1));
	url.searchParams.set('p', option.pitch.toFixed(0));
	url.searchParams.set('b', option.bearing.toFixed(0));
	replaceState(url, {});
};

/** street view用のURLパラメータのセット */
export const setStreetViewParams = (imageId: string) => {
	const url = new URL(page.url);
	url.searchParams.set('imageId', imageId);
	replaceState(url, {});
};

/** street view用のURLパラメータの取得 */
export const getStreetViewParams = (): string | null => {
	const url = new URL(page.url);
	if (!url.searchParams.has('imageId')) {
		return null;
	}
	return url.searchParams.get('imageId') as string;
};
