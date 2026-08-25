import { describe, expect, it } from 'vitest';

import {
	getJapanPlaneRectangularEpsg,
	getJapanPlaneRectangularInfo,
	getJapanPlaneRectangularProj4ByEpsg,
	getJapanPlaneRectangularSystems,
	getJapanPlaneRectangularZoneFromEpsg
} from './japan-plane-rectangular';

describe('japan plane rectangular', () => {
	it('19系ぶんの辞書を返せる', () => {
		expect(getJapanPlaneRectangularSystems()).toHaveLength(19);
	});

	it('系番号から原点とEPSGを引ける', () => {
		const zone9 = getJapanPlaneRectangularInfo(9);

		expect(zone9?.name).toBe('平面直角座標系第9系');
		expect(zone9?.originLongitude).toBeCloseTo(139.8333333333333, 12);
		expect(zone9?.originLatitude).toBe(36);
		expect(zone9?.areaOfUse).toContain('東京都');
		expect(zone9?.epsg.jgd2000).toBe('EPSG:2451');
		expect(zone9?.epsg.jgd2011).toBe('EPSG:6677');
	});

	it('JGD2000/JGD2011 の EPSG から系番号を逆引きできる', () => {
		expect(getJapanPlaneRectangularZoneFromEpsg('EPSG:2443')).toBe(1);
		expect(getJapanPlaneRectangularZoneFromEpsg('EPSG:30161')).toBe(1);
		expect(getJapanPlaneRectangularZoneFromEpsg('epsg:6687')).toBe(19);
	});

	it('JGD2000 の proj4 定義を EPSG から生成できる', () => {
		expect(getJapanPlaneRectangularEpsg(7, 'jgd2000')).toBe('EPSG:2449');
		expect(getJapanPlaneRectangularProj4ByEpsg('EPSG:2449')).toContain(
			'+lon_0=137.1666666666667'
		);
	});

	it('旧日本測地系の proj4 定義を EPSG から生成できる', () => {
		expect(getJapanPlaneRectangularEpsg(7, 'tokyo')).toBe('EPSG:30167');
		expect(getJapanPlaneRectangularProj4ByEpsg('EPSG:30167', 'tokyo')).toContain(
			'+nadgrids=@tky2jgd,null'
		);
	});
});
