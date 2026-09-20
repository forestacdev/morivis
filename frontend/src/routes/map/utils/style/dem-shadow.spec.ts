import { DEFAULT_DEM_SHADOW_STYLE } from '$routes/map/data/types/raster';
import { describe, expect, it } from 'vitest';

import { getDemLightDirection, getDemShadowColors, normalizeDemShadowStyle } from './dem-shadow';

describe('DEM 陰影の光源', () => {
	it('旧エントリと不正な角度には既定値を使う', () => {
		expect(normalizeDemShadowStyle()).toEqual({
			...DEFAULT_DEM_SHADOW_STYLE,
			azimuth: 315,
			altitude: 45
		});
		expect(normalizeDemShadowStyle({ azimuth: NaN, altitude: Infinity }))
			.toEqual({ ...DEFAULT_DEM_SHADOW_STYLE, azimuth: 315, altitude: 45 });
	});

	it('方位を一周に正規化し、高度を水平から真上の範囲に収める', () => {
		expect(normalizeDemShadowStyle({ azimuth: -45, altitude: -10 }))
			.toEqual({ ...DEFAULT_DEM_SHADOW_STYLE, azimuth: 315, altitude: 0 });
		expect(normalizeDemShadowStyle({ azimuth: 720, altitude: 100 }))
			.toEqual({ ...DEFAULT_DEM_SHADOW_STYLE, azimuth: 0, altitude: 90 });
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

describe('DEM 陰影の配色', () => {
	it('色を持たない保存済みスタイルは黒い影と白いベースになる', () => {
		expect(getDemShadowColors({ azimuth: 0, altitude: 0 })).toEqual({
			shadow: [0, 0, 0, 1],
			base: [1, 1, 1, 1]
		});
	});
	it('短い HEX と大文字を正規化し、不正な色は既定値に戻す', () => {
		expect(normalizeDemShadowStyle({ shadowColor: '#A3F', baseColor: '#ABCDEF' }))
			.toMatchObject({ shadowColor: '#aa33ff', baseColor: '#abcdef' });
		expect(normalizeDemShadowStyle({ shadowColor: 'invalid', baseColor: '#fffffg' }))
			.toMatchObject({ shadowColor: '#000000', baseColor: '#ffffff' });
	});
	it('ベースを透明にしても色を保持し、切り戻すと同じ色で描画する', () => {
		const style = normalizeDemShadowStyle({
			shadowColor: '#336699',
			baseColor: '#ffcc00',
			baseTransparent: true
		});
		expect(style.baseColor).toBe('#ffcc00');
		expect(getDemShadowColors(style)).toEqual({
			shadow: [0.2, 0.4, 0.6, 1],
			base: [1, 0.8, 0, 0]
		});
		expect(getDemShadowColors({ ...style, baseTransparent: false }).base).toEqual([
			1,
			0.8,
			0,
			1
		]);
	});
});
