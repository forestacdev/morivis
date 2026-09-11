import { describe, expect, it } from 'vitest';

import { estimateSurfaceNormals } from './surface-normals';

describe('building surface normals', () => {
	it('keeps roof normals perpendicular to the roof near a wall junction', () => {
		const points: number[] = [], roofNearEdge: number[] = [];
		for (let y = -10; y <= 10; y++) {
			for (let x = 0; x <= 10; x++) {
				points.push(x, y, 0);
				if (x === 1 && Math.abs(y) < 8) roofNearEdge.push(points.length / 3 - 1);
				if (x > 0) points.push(0, y, -x);
			}
		}
		const { normals } = estimateSurfaceNormals(new Float32Array(points), true);
		for (const id of roofNearEdge) {
			expect(Math.abs(normals[id * 3 + 2])).toBeCloseTo(1, 6);
			expect(normals[id * 3]).toBeCloseTo(0, 6);
			expect(normals[id * 3 + 1]).toBeCloseTo(0, 6);
		}
	});
});
