import { describe, expect, it } from 'vitest';

import {
	getEpsgInfoArray,
	getName,
	getProjContext,
	getWkt,
	isValidEpsg
} from './dict';

describe('proj dict', () => {
	it('旧日本測地系の地理座標系と平面直角座標系を有効な EPSG として扱える', () => {
		expect(isValidEpsg('4301')).toBe(true);
		expect(isValidEpsg('30161')).toBe(true);
		expect(getName('4301')).toBe('旧日本測地系 / 地理座標系');
		expect(getName('30161')).toBe('旧日本測地系 / 平面直角座標系第1系');
		expect(getProjContext('30161')).toContain('+ellps=bessel');
		expect(getProjContext('30161')).toContain('+nadgrids=@tky2jgd,null');
		expect(getWkt('30161')).toContain('AUTHORITY["EPSG","30161"]');
	});

	it('JGD2000 の平面直角座標系を有効な EPSG として扱える', () => {
		expect(isValidEpsg('2451')).toBe(true);
		expect(getName('2451')).toBe('日本測地系2000 / 平面直角座標系第9系');
		expect(getProjContext('2451')).toContain('+lon_0=139.8333333333333');
		expect(getWkt('2451')).toContain('AUTHORITY["EPSG","2451"]');
	});

	it('JGD2011 の各系を先に並べたまま JGD2000 の各系を候補に追加する', () => {
		const codes = getEpsgInfoArray().map((info) => info.code);

		expect(codes).toContain('6677');
		expect(codes).toContain('2451');
		expect(codes).toContain('30161');
		expect(codes.indexOf('6677')).toBeLessThan(codes.indexOf('2451'));
		expect(codes.indexOf('2451')).toBeLessThan(codes.indexOf('30161'));
	});
});
