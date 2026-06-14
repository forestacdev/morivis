import { describe, expect, it } from 'vitest';

import { rasterizePointCloudToDem } from './rasterize-core';

describe('rasterizePointCloudToDem', () => {
	it('点が疎でも周辺セルへ距離加重で高さが入る', () => {
		const positions = new Float32Array([
			0,
			0,
			10,
			2,
			0,
			20,
			0,
			2,
			30,
			2,
			2,
			40
		]);

		const result = rasterizePointCloudToDem({
			positions,
			bbox: [0, 0, 2, 2],
			longEdgePixels: 3
		});

		expect(result.width).toBe(3);
		expect(result.height).toBe(3);
		expect(result.band[4]).not.toBe(result.nodata);
		expect(result.band[4]).toBeGreaterThan(10);
		expect(result.band[4]).toBeLessThan(40);
	});
});
