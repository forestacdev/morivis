import { describe, expect, it } from 'vitest';
import { normalizeCswMapBounds } from './ui';

describe('CSW map bounds', () => {
	it('世界をまたいだ地図範囲を日付変更線を横切る範囲へ戻す', () => {
		expect(normalizeCswMapBounds([170, -10, 190, 10])).toEqual([170, -10, -170, 10]);
		expect(normalizeCswMapBounds([-190, -10, -170, 10])).toEqual([170, -10, -170, 10]);
	});
	it('全世界以上の表示範囲と緯度を制限する', () => {
		expect(normalizeCswMapBounds([-400, -100, 400, 100])).toEqual([-180, -90, 180, 90]);
	});
});
