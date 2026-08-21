import { describe, expect, it } from 'vitest';

import { mercatorToLat, mercatorToLng } from './mercator';

describe('arcgis mercator helpers', () => {
	it('メルカトル X を経度へ変換する', () => {
		expect(mercatorToLng(0)).toBe(0);
		expect(mercatorToLng(20037508.34)).toBeCloseTo(180, 6);
		expect(mercatorToLng(-20037508.34)).toBeCloseTo(-180, 6);
	});

	it('メルカトル Y を緯度へ変換する', () => {
		expect(mercatorToLat(0)).toBeCloseTo(0, 6);
		expect(mercatorToLat(20037508.34)).toBeCloseTo(85.05112878, 5);
		expect(mercatorToLat(-20037508.34)).toBeCloseTo(-85.05112878, 5);
	});
});
