import { describe, expect, it } from 'vitest';

import { hasIfcGeographicCoordinates } from './ifc-metadata';

describe('hasIfcGeographicCoordinates', () => {
	it('緯度経度がない IFC は座標系の選択が必要になる', () => {
		expect(hasIfcGeographicCoordinates({ placementQuality: 'normalized' })).toBe(false);
	});

	it('緯度経度を持つ IFC は地理配置できる', () => {
		expect(hasIfcGeographicCoordinates({ lng: 136.1, lat: 35.2 })).toBe(true);
	});
});
