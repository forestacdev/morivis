import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { buildMercatorModelMatrix } from '$routes/map/utils/three/mercator-model-matrix';
import { localizeSurfacePoints } from './surface-coordinates';

describe('surface coordinate placement', () => {
	it('preserves metre offsets and adds the source altitude exactly once', () => {
		const result = localizeSurfacePoints({
			positions: new Float32Array([2, 3, 4, -2, -3, -4]),
			coordinateOrigin: [0, 0, 10],
			bounds: [-1, -1, 1, 1]
		});
		expect([...result.positions]).toEqual([2, 3, 14, -2, -3, 6]);
		expect(result.lng).toBe(0);
		expect(result.lat).toBe(0);
	});

	it('places glTF east/up/south axes at the original geographic coordinates', () => {
		const source = new Float32Array([0.001, 0.002, 12]);
		const local = localizeSurfacePoints({ positions: source, bounds: [-1, -1, 1, 1] });
		const matrix = buildMercatorModelMatrix({
			lng: local.lng,
			lat: local.lat,
			altitude: 0,
			heightOffset: 0,
			heightScale: 1,
			baseRotationX: -180,
			scale: 1,
			rotationX: 0,
			rotationY: 0,
			rotationZ: 0
		}, false);
		const world = new Vector3(local.positions[0], local.positions[2], -local.positions[1])
			.applyMatrix4(matrix);
		expect(world.x).toBeCloseTo((source[0] + 180) / 360, 9);
		const expectedY =
			(180 - 180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + source[1] * Math.PI / 360)))
			/ 360;
		expect(world.y).toBeCloseTo(expectedY, 9);
		expect(world.z).toBeCloseTo(12 / 40075016.68557849, 12);
	});

	it('rejects unplaced projected coordinates', () => {
		expect(() =>
			localizeSurfacePoints({
				positions: new Float32Array([1000, 1000, 0]),
				bounds: [-1, -1, 1, 1]
			})
		).toThrow('座標系');
	});
});
