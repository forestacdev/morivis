import {
	WEB_MERCATOR_MAX_LAT,
	WEB_MERCATOR_MIN_LAT
} from '$routes/map/data/entries/_meta_data/_bounds';
import { describe, expect, it } from 'vitest';
import {
	isValidModelPlacementLatitude,
	isValidModelPlacementLongitude
} from './model-placement-coordinates';

describe('model placement coordinate input', () => {
	it.each([undefined, null, '', '0', NaN, Infinity, -Infinity])(
		'rejects empty or non-finite input (%s)',
		(value) => {
			expect(isValidModelPlacementLatitude(value)).toBe(false);
			expect(isValidModelPlacementLongitude(value)).toBe(false);
		}
	);

	it('accepts zero and both longitude boundaries, but rejects values beyond them', () => {
		for (const value of [-180, 0, 180]) {
			expect(isValidModelPlacementLongitude(value)).toBe(true);
		}
		for (const value of [-180.0001, 180.0001]) {
			expect(isValidModelPlacementLongitude(value)).toBe(false);
		}
	});

	it('limits latitude to the map extent, including its edges and excluding the poles', () => {
		for (const value of [WEB_MERCATOR_MIN_LAT, 0, WEB_MERCATOR_MAX_LAT]) {
			expect(isValidModelPlacementLatitude(value)).toBe(true);
		}
		for (
			const value of [
				WEB_MERCATOR_MIN_LAT - 0.0001,
				WEB_MERCATOR_MAX_LAT + 0.0001,
				-90,
				90,
				91
			]
		) {
			expect(isValidModelPlacementLatitude(value)).toBe(false);
		}
	});
});
