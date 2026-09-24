import { describe, expect, it } from 'vitest';
import { rasterizePoiSdf } from './poi-marker-image';

const rgba = (alpha: number[]) => new Uint8Array(alpha.flatMap((value) => [0, 0, 0, value]));
const alphas = (pixels: Uint8ClampedArray) =>
	Array.from(pixels).filter((_, index) => index % 4 === 3);

describe('POIのSDF再描画', () => {
	it('透明度に変換する前に距離場を補間し、低解像度の輪郭を引き伸ばさない', () => {
		const source = rgba([0, 255, 255, 0]);
		const original = source.slice();
		const output = alphas(rasterizePoiSdf(source, 2, 2, 3, 3, 1));
		expect(output).toEqual([0, 0, 255, 0, 0, 0, 255, 0, 0]);
		expect(source).toEqual(original);
	});

	it('拡大時も輪郭だけを滑らかにし、内側と外側はぼかさない', () => {
		const output = alphas(rasterizePoiSdf(rgba([176, 208]), 2, 1, 32, 16, 1));
		const row = output.slice(0, 32);
		expect(row.slice(0, 15).every((alpha) => alpha === 0)).toBe(true);
		expect(row.slice(20).every((alpha) => alpha === 255)).toBe(true);
		const edgePixels = row.filter((alpha) => alpha > 0 && alpha < 255);
		expect(edgePixels.length).toBeGreaterThan(0);
		expect(edgePixels.length).toBeLessThanOrEqual(3);
	});
});
