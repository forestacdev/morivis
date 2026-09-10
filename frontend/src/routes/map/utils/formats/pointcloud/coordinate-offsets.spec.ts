import { describe, expect, it } from 'vitest';

import { createPointCloudMeterOffsets } from './coordinate-offsets';

describe('point cloud meter offsets', () => {
	it('Float64 の投影座標を地理座標原点からの小さなメートル差分にする', () => {
		const result = createPointCloudMeterOffsets(
			new Float64Array([1000.1234, 2000.5678, 12.5, 1001.2345, 2001.6789, 13.5]),
			[1000, 2000],
			[130, 30, 10]
		);

		expect(result.coordinateOrigin).toEqual([130, 30, 10]);
		expect(Array.from(result.positions)).toEqual([
			expect.closeTo(0.1234, 5),
			expect.closeTo(0.5678, 5),
			2.5,
			expect.closeTo(1.2345, 5),
			expect.closeTo(1.6789, 5),
			3.5
		]);
	});
});
