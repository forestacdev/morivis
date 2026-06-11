import { get } from 'svelte/store';
import { queryParameters, ssp } from 'sveltekit-search-params';

import { browser } from '$app/environment';
import { MAP_POSITION, type MapPosition } from '$routes/constants';
import { isStreetView } from '$routes/stores';
import { isTerrain3d } from '$routes/stores/map';
import { debounce } from 'es-toolkit';

// URLパラメータの保留中の更新を管理（競合を防ぐためのdebounce機構）
let pendingParams: Record<string, string | undefined> = {};

/**
 * 保留中のパラメータをURLに反映する
 */
const flushUrlParams = () => {
	if (!browser) return;
	const store = queryParameters({}, { pushHistory: false });
	const params = get(store);

	for (const [key, value] of Object.entries(pendingParams)) {
		if (value === undefined) {
			delete params[key];
			continue;
		}

		params[key] = value;
	}

	store.set(params);
	pendingParams = {};
};

// es-toolkitのdebounceを使用して10ms後にまとめて更新
const debouncedFlush = debounce(flushUrlParams, 10);

/**
 * URLパラメータの更新をスケジュールする（debounce処理）
 * @param {string} key - パラメータキー
 * @param {string | undefined} value - パラメータ値
 */
const scheduleUrlUpdate = (key: string, value: string | undefined) => {
	pendingParams[key] = value;
	debouncedFlush();
};

/**
 * 複数のURLパラメータ更新をまとめてスケジュールする
 */
const scheduleUrlUpdates = (params: Record<string, string | undefined>) => {
	Object.assign(pendingParams, params);
	debouncedFlush();
};

/**
 * 特定のURLパラメータ削除をスケジュールする
 */
export const scheduleUrlParamRemoval = (key: string) => {
	scheduleUrlUpdate(key, undefined);
};

/** 座標の検証 */
const isValidCoordinate = (lng: number, lat: number): boolean => {
	return !isNaN(lng) && !isNaN(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
};

/** ズームレベルの検証 */
const isValidZoom = (zoom: number): boolean => {
	return !isNaN(zoom) && zoom >= 0 && zoom <= 24;
};

/** ピッチの検証 */
const isValidPitch = (pitch: number): boolean => {
	return !isNaN(pitch) && pitch >= 0 && pitch <= 85;
};

/** ベアリングの検証 */
const isValidBearing = (bearing: number): boolean => {
	return !isNaN(bearing) && bearing >= -180 && bearing <= 180;
};

/* urlパラメーターの取得 **/
export const getParams = (params: string): { [key: string]: string; } => {
	const paramsArray = params.slice(1).split('&');
	const paramsObject: { [key: string]: string; } = {};
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
		params.c === null
		|| params.c === undefined
		|| params.z === null
		|| params.z === undefined
		|| params.p === null
		|| params.p === undefined
		|| params.b === null
		|| params.b === undefined
	) {
		return MAP_POSITION;
	}

	try {
		const centerParts = params.c.split('_');

		if (centerParts.length !== 2) {
			return MAP_POSITION;
		}

		const [lng, lat] = centerParts.map(Number);

		if (!isValidCoordinate(lng, lat)) {
			console.warn('Invalid coordinates:', { lng, lat });
			return MAP_POSITION;
		}

		const zoom = Number(params.z);
		const pitch = Number(params.p);
		const bearing = Number(params.b);

		if (!isValidZoom(zoom)) {
			console.warn('Invalid zoom:', zoom);
			return MAP_POSITION;
		}

		if (!isValidPitch(pitch)) {
			console.warn('Invalid pitch:', pitch);
			return MAP_POSITION;
		}

		if (!isValidBearing(bearing)) {
			console.warn('Invalid bearing:', bearing);
			return MAP_POSITION;
		}

		return {
			center: [lng, lat],
			zoom,
			pitch,
			bearing
		};
	} catch (error) {
		console.error('Error parsing map parameters:', error);
		return MAP_POSITION;
	}
};

/** 地図表示のURLパラメータのセット */
export const setMapParams = (option: MapPosition) => {
	// アンダースコア区切りで結合
	const center = option.center.map((value) => value.toFixed(6)).join('_');
	scheduleUrlUpdates({
		c: center,
		z: option.zoom.toFixed(1),
		p: option.pitch.toFixed(0),
		b: option.bearing.toFixed(0),
		sv: !get(isStreetView) ? '-1' : undefined,
		'3d': !get(isTerrain3d) ? '0' : undefined
	});
};

/** street view用のURLパラメータのセット */
export const setStreetViewParams = (nodeId: number) => {
	scheduleUrlUpdate('sv', nodeId.toString());
};

/** streetview用のURLパラメータの取得 */
export const getStreetViewParams = (): string | null => {
	const params = get(queryParameters({}, { pushHistory: false }));
	return params.sv as string;
};

/** streetviewカメラパラメータのセット */
export const setStreetViewCameraParams = ({ x, y }: { x: number; y: number; }) => {
	scheduleUrlUpdate('cr', `${x.toFixed(2)}_${y.toFixed(2)}`);
};

/** streetviewカメラパラメータの取得 */
export const getStreetViewCameraParams = (): { x: number; y: number; } | null => {
	const params = get(queryParameters({}, { pushHistory: false }));
	const cr = params.cr as string;

	if (!cr) {
		return null;
	}

	const [xStr, yStr] = cr.split('_');
	const x = parseFloat(xStr);
	const y = parseFloat(yStr);

	if (isNaN(x) || isNaN(y)) {
		return null;
	}

	return { x, y };
};

/** 3d用のURLパラメータのセット */
export const set3dParams = (numString: '0' | '1') => {
	scheduleUrlUpdate('3d', numString);
};

/** 3d用のURLパラメータの取得 */
export const get3dParams = (): string | null => {
	const params = get(queryParameters({}, { pushHistory: false }));
	return params['3d'] as string;
};

export const removeUrlParams = (paramName: string) => {
	scheduleUrlParamRemoval(paramName);
};

/** オブジェクトをURLパラメータに変換 */
export const objectToUrlParams = (obj: Record<string, unknown>): string => {
	const params = new URLSearchParams();
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			const value = obj[key];
			if (Array.isArray(value)) {
				// 値が配列の場合は、キーを複数回繰り返して追加
				value.forEach((item) => {
					params.append(key, String(item));
				});
			} else if (value !== undefined && value !== null) {
				// 値が undefined または null でない場合のみ追加
				params.append(key, String(value));
			}
		}
	}
	return params.toString();
};
