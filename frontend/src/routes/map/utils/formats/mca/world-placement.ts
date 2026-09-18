import {
	isValidModelPlacementLatitude,
	isValidModelPlacementLongitude
} from '$routes/map/utils/three/model-placement-coordinates';
import type { McaRegionPosition } from './types';

export interface McaWorldPlacement {
	lng: number;
	lat: number;
	metersPerBlock: number;
}

/** 前回の確定値、または地図中心をジオリファレンス開始時の仮配置に使う。 */
export const getInitialMcaWorldPlacement = (
	center: { lng: number; lat: number; } | undefined,
	previous: McaWorldPlacement | null
): McaWorldPlacement => {
	if (previous && validateMcaWorldPlacement(previous) === null) return { ...previous };
	return {
		lng: center && Number.isFinite(center.lng)
			? ((center.lng + 180) % 360 + 360) % 360 - 180
			: 0,
		lat: center && isValidModelPlacementLatitude(center.lat) ? center.lat : 0,
		metersPerBlock: 1
	};
};

export const isMcaRegionPositionValid = (region: McaRegionPosition) =>
	[region.x, region.z].every((value) =>
		Number.isSafeInteger(value) && Number.isSafeInteger(value * 512 + 511)
	);

/** r.x.z.mcaのx/zは32チャンク（512ブロック）単位。負数もそのまま扱う。 */
export const parseMcaRegionFileName = (name: string): McaRegionPosition | null => {
	const match = /^r\.(-?\d+)\.(-?\d+)\.mca$/i.exec(name);
	if (!match) return null;
	const region = { x: Number(match[1]), z: Number(match[2]) };
	return isMcaRegionPositionValid(region) ? region : null;
};

export const validateMcaWorldPlacement = (placement: McaWorldPlacement): string | null => {
	if (!isValidModelPlacementLongitude(placement.lng)) {
		return 'ワールド原点の経度は-180〜180で指定してください。';
	}
	if (!isValidModelPlacementLatitude(placement.lat)) {
		return 'ワールド原点の緯度は-85.051128〜85.051128で指定してください。';
	}
	if (!Number.isFinite(placement.metersPerBlock) || placement.metersPerBlock <= 0) {
		return '1ブロックの長さは0より大きい有限の数値を入力してください。';
	}
	return null;
};
