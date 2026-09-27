import proj4 from 'proj4';
import { describe, expect, it } from 'vitest';

import { rasterizePointCloudToDem } from './rasterize-core';

describe('rasterizePointCloudToDem', () => {
	it('投影座標を経緯度のセルへ配置し、微小な点間隔と標高を保つ', () => {
		const positions = new Float64Array([
			1000000.001,
			2000000.002,
			10,
			1000000.021,
			2000000.002,
			20,
			1000000.001,
			2000000.022,
			30,
			1000000.021,
			2000000.022,
			40
		]);
		const projectionDefinition = 'EPSG:3857';
		const geographic = new Float64Array(positions.length);
		for (let i = 0; i < positions.length; i += 3) {
			const [x, y] = proj4(projectionDefinition, 'EPSG:4326', [
				positions[i],
				positions[i + 1]
			]);
			geographic.set([x, y, positions[i + 2]], i);
		}
		const bbox: [number, number, number, number] = [
			geographic[0],
			geographic[1],
			geographic[9],
			geographic[10]
		];
		const result = rasterizePointCloudToDem({
			positions,
			projectionDefinition,
			bbox,
			longEdgePixels: 3
		});
		expect(result).toEqual(
			rasterizePointCloudToDem({ positions: geographic, bbox, longEdgePixels: 3 })
		);
		expect(result.width).toBe(3);
		expect(result.height).toBe(3);
		expect([result.band[0], result.band[2], result.band[6], result.band[8]]).toEqual([
			30,
			40,
			10,
			20
		]);
	});

	it('解釈できない投影法は誤配置せずエラーにする', () => {
		expect(() =>
			rasterizePointCloudToDem({
				positions: new Float64Array([0, 0, 10]),
				projectionDefinition: 'test-invalid-projection',
				bbox: [0, 0, 1, 1],
				longEdgePixels: 3
			})
		).toThrow();
	});

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
