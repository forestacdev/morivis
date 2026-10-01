import { createTestRegionalZarr } from '$routes/map/utils/formats/geozarr/__fixtures__/test-regions';
import { ColorMapManager } from '$routes/map/utils/style/color-mapping';
import { describe, expect, it } from 'vitest';
import { parseGpmLayout, reduceGpmColumnMax, renderGpmPixels } from './gpm';
import { tileLatitude } from './grid';
const metadata = () =>
	JSON.parse(new TextDecoder().decode(createTestRegionalZarr().get('zarr.json'))).attributes.gpm;
const array = { shape: [2, 2, 2, 2], chunks: [1, 2, 2, 2], dtype: 'float32' };
describe('地域索引を持つZarrの2D表示', () => {
	it('地域範囲の和集合と概観配列を認識する', () => {
		expect(parseGpmLayout(metadata(), 'detail', array)).toMatchObject({
			bbox: [-40, 40, 40, 60],
			dimensions: [2, 2, 2],
			height: { min: 0, max: 2000, step: 1000 },
			overviewPath: 'overview',
			overviewDimensions: [1, 1, 1]
		});
		expect(parseGpmLayout(undefined, 'detail', array)).toBeNull();
	});
	it('地域索引と配列の不一致を拒否する', () => {
		expect(() => parseGpmLayout(metadata(), 'detail', { ...array, shape: [1, 2, 2, 2] }))
			.toThrow('一致');
		const meta = metadata();
		meta.tiles[1].index = 0;
		expect(() => parseGpmLayout(meta, 'detail', array)).toThrow('地域番号');
	});
	it('高度最大値は欠損を除き、観測値0を保持する', () => {
		expect(Array.from(reduceGpmColumnMax([-1, 0, 1, 2, -1, 0, 4, 3], [2, 2, 2], -1))).toEqual([
			NaN,
			0,
			4,
			3
		]);
	});
	it('指定高度の層では他の高度の値を混ぜず、欠損と0を保持する', () => {
		const data = [-1, 0, 1, 2, 8, 4, -1, 3];
		expect(Array.from(reduceGpmColumnMax(data, [2, 2, 2], -1, 0))).toEqual([NaN, 0, 1, 2]);
		expect(Array.from(reduceGpmColumnMax(data, [2, 2, 2], -1, 1))).toEqual([8, 4, NaN, 3]);
	});
	it('高度と集約方法ごとにキャッシュを分け、格子解像度に応じて高度を選ぶ', async () => {
		const layout = parseGpmLayout(metadata(), 'detail', array)!;
		const request = {
			x: 0,
			y: 0,
			z: 0,
			size: 256,
			min: 0,
			max: 8,
			colorMap: 'jet',
			cacheKey: 'test-height'
		};
		const signal = new AbortController().signal;
		const read = async () => [1, 1, 1, 1, 8, 8, 8, 8];
		const lower = await renderGpmPixels(
			layout,
			{ ...request, mode: 'height', height: 999 },
			read,
			signal
		);
		const upper = await renderGpmPixels(
			layout,
			{ ...request, mode: 'height', height: 1000 },
			read,
			signal
		);
		const maximum = await renderGpmPixels(layout, request, read, signal);
		expect(lower).not.toEqual(upper);
		expect(maximum).toEqual(upper);
		const overview = await renderGpmPixels(
			{ ...layout, dimensions: [1, 1, 1] },
			{
				...request,
				cacheKey: 'test-height-overview',
				mode: 'height',
				height: 1000
			},
			async () => [8],
			signal
		);
		expect(overview).toEqual(upper);
		const outside = await renderGpmPixels(
			layout,
			{ ...request, mode: 'height', height: 2000 },
			read,
			signal
		);
		expect(outside.every(value => value === 0)).toBe(true);
	});
	it('逆転した高度範囲を拒否する', () => {
		const meta = metadata();
		meta.tiles[0].bounds.maxHeight = -1;
		expect(() => parseGpmLayout(meta, 'detail', array)).toThrow('高度範囲');
	});
	it('別々の地域を正しい位置へ描き、地域間と欠損を透明にする', async () => {
		const layout = parseGpmLayout(metadata(), 'detail', array)!;
		const values = [[-1, 0, 1, 2, -1, 4, -1, 3], [8, 0, 0, 0, 2, 5, 1, 0]];
		const pixels = await renderGpmPixels(
			layout,
			{
				x: 0,
				y: 0,
				z: 0,
				size: 256,
				min: 0,
				max: 8,
				colorMap: 'jet',
				cacheKey: 'test-regions'
			},
			async index => values[index],
			new AbortController().signal
		);
		const palette = new ColorMapManager().createColorArray('jet');
		const expected = [[NaN, 4, 1, 3], [8, 5, 1, 0]];
		let painted = 0, transparent = 0;
		for (let row = 0; row < 256; row++) {
			for (let col = 0; col < 256; col++) {
				const lon = (col + 0.5) / 256 * 360 - 180, lat = tileLatitude(0, 0, row, 256);
				const region = layout.regions.find(({ bounds: b }) =>
					lon >= b.west && lon < b.east && lat >= b.south && lat < b.north
				);
				let value = NaN;
				if (region) {
					const b = region.bounds;
					value = expected[region.index][
						Math.floor((lat - b.south) / 10) * 2 + Math.floor((lon - b.west) / 10)
					];
				}
				const offset = (row * 256 + col) * 4;
				if (!Number.isFinite(value)) {
					expect(pixels[offset + 3]).toBe(0);
					transparent++;
				} else {
					const color = Math.round(value / 8 * 255) * 3;
					expect(Array.from(pixels.slice(offset, offset + 4))).toEqual([
						...palette.slice(color, color + 3),
						255
					]);
					painted++;
				}
			}
		}
		expect(painted).toBeGreaterThan(0);
		expect(transparent).toBeGreaterThan(0);
	});
});
