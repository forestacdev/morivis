import proj4 from 'proj4';
import { describe, expect, it } from 'vitest';

import { sampleTestMesh } from './__fixtures__/test-mesh';
import { buildTriangulation } from './triangulation';

describe('COGのWebメルカトル再投影', () => {
	it.each([[20, 80], [-70, 70]])('緯度%s〜%sの画素位置を投影後も保つ', (south, north) => {
		const { triangles } = buildTriangulation([0, south, 40, north], null, [768, 768]);
		const northY = proj4('EPSG:4326', 'EPSG:3857', [0, north])[1];
		const southY = proj4('EPSG:4326', 'EPSG:3857', [0, south])[1];
		for (let row = 1; row < 100; row++) {
			const y = row / 100;
			const [lon, lat] = sampleTestMesh(triangles, 0.37, y);
			expect(lon).toBeCloseTo(40 * 0.37, 8);
			const actualY = proj4('EPSG:4326', 'EPSG:3857', [lon, lat])[1];
			const pixelError = Math.abs((northY - actualY) / (northY - southY) - y) * 768;
			expect(pixelError).toBeLessThan(0.6);
		}
	});

	it('EPSG:3857のCOGは余計に変形しない', () => {
		const { triangles } = buildTriangulation([0, 20, 40, 80], 'EPSG:3857');
		expect(triangles).toHaveLength(2);
		const northY = proj4('EPSG:4326', 'EPSG:3857', [0, 80])[1];
		const southY = proj4('EPSG:4326', 'EPSG:3857', [0, 20])[1];
		expect(sampleTestMesh(triangles, 0.5, 0.5)[1]).toBeCloseTo((northY + southY) / 2, 6);
	});
});
