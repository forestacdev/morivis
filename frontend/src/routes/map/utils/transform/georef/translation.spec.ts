import { expect, it } from 'vitest';

import { MercatorCoordinate } from '$routes/map/utils/maplibre';

import { testScreenDiamond, testSkewedCorners } from './__fixtures__/translation';
import { isInsideGeoRefImage, translateGeoRefCorners } from './translation';

it('自由変形した画像を高緯度へ移動しても、全ての辺の向きと長さを保つ', () => {
	const before = testSkewedCorners.map((point) => MercatorCoordinate.fromLngLat(point));
	const after = translateGeoRefCorners(testSkewedCorners, [0, 0], [15, 60]).map((point) =>
		MercatorCoordinate.fromLngLat(point)
	);
	for (let i = 1; i < 4; i++) {
		expect(after[i].x - after[0].x).toBeCloseTo(before[i].x - before[0].x, 12);
		expect(after[i].y - after[0].y).toBeCloseTo(before[i].y - before[0].y, 12);
	}
	expect(after[0].x).not.toBe(before[0].x);
	expect(after[0].y).not.toBe(before[0].y);
});

it('世界の端では全体の移動を止め、四隅を個別に押し潰さない', () => {
	const result = translateGeoRefCorners(testSkewedCorners, [0, 0], [180, 85]);
	expect(Math.max(...result.map((point) => point[0]))).toBeCloseTo(180);
	expect(result[1][0] - result[0][0]).toBeCloseTo(4);
	const before = testSkewedCorners.map((point) => MercatorCoordinate.fromLngLat(point));
	const after = result.map((point) => MercatorCoordinate.fromLngLat(point));
	expect(Math.min(...after.map((point) => point.y))).toBeCloseTo(0);
	expect(after[2].y - after[0].y).toBeCloseTo(before[2].y - before[0].y, 12);
});

it('回転した画像の外接矩形の余白をつかんでも画像移動を開始しない', () => {
	expect(isInsideGeoRefImage([100, 100], testScreenDiamond)).toBe(true);
	expect(isInsideGeoRefImage([25, 25], testScreenDiamond)).toBe(false);
	expect(isInsideGeoRefImage([200, 100], testScreenDiamond)).toBe(false);
	expect(translateGeoRefCorners(testSkewedCorners, [0, 0], [NaN, 0])).toEqual(testSkewedCorners);
});
