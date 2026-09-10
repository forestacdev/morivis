import { describe, expect, it } from 'vitest';

import { getDemLightDirection, normalizeDemShadowStyle } from './dem-shadow';

describe('DEM 陰影の光源', () => {
	it('旧エントリと不正な角度には既定値を使う', () => {
		expect(normalizeDemShadowStyle()).toEqual({ azimuth: 315, altitude: 45 });
		expect(normalizeDemShadowStyle({ azimuth: NaN, altitude: Infinity }))
			.toEqual({ azimuth: 315, altitude: 45 });
	});

	it('方位を一周に正規化し、高度を水平から真上の範囲に収める', () => {
		expect(normalizeDemShadowStyle({ azimuth: -45, altitude: -10 }))
			.toEqual({ azimuth: 315, altitude: 0 });
		expect(normalizeDemShadowStyle({ azimuth: 720, altitude: 100 }))
			.toEqual({ azimuth: 0, altitude: 90 });
	});

	it.each([
		[0, [0, 0, -1]],
		[90, [1, 0, 0]],
		[180, [0, 0, 1]],
		[270, [-1, 0, 0]]
	])('方位 %s° は東・上・南の座標系で正しい向きになる', (azimuth, expected) => {
		const direction = getDemLightDirection({ azimuth: azimuth as number, altitude: 0 });
		(expected as number[]).forEach((value, i) => expect(direction[i]).toBeCloseTo(value));
	});

	it('真上の光源は方位によらず上を向く', () => {
		const direction = getDemLightDirection({ azimuth: 123, altitude: 90 });
		expect(direction[0]).toBeCloseTo(0);
		expect(direction[1]).toBeCloseTo(1);
		expect(direction[2]).toBeCloseTo(0);
	});
});
