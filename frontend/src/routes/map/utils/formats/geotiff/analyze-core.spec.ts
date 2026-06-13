import { describe, expect, it } from 'vitest';
import type { ReadRasterResult } from 'geotiff';

import { parseBboxFromGeoTiffImage } from './analyze-core';

const createImageStub = (overrides: Partial<{
	getBoundingBox: () => [number, number, number, number];
	getOrigin: () => [number, number];
	getResolution: () => [number, number];
}>) => ({
	fileDirectory: {},
	getBoundingBox: overrides.getBoundingBox ?? (() => [1, 2, 3, 4] as [number, number, number, number]),
	getOrigin: overrides.getOrigin ?? (() => [0, 0] as [number, number]),
	getResolution: overrides.getResolution ?? (() => [1, -1] as [number, number]),
	getWidth: () => 0,
	getHeight: () => 0,
	readRasters: async () => [] as unknown as ReadRasterResult
});

describe('parseBboxFromGeoTiffImage', () => {
	it('getBoundingBox が使えるときはその値を返す', () => {
		const image = createImageStub({});

		expect(parseBboxFromGeoTiffImage(image, 10, 20)).toEqual([1, 2, 3, 4]);
	});

	it('getBoundingBox が失敗したら origin と resolution から計算する', () => {
		const image = createImageStub({
			getBoundingBox: () => {
				throw new Error('missing metadata');
			},
			getOrigin: () => [100, 200],
			getResolution: () => [5, -10]
		});

		expect(parseBboxFromGeoTiffImage(image, 2, 3)).toEqual([100, 170, 110, 200]);
	});

	it('フォールバックに必要な値が不正なら null を返す', () => {
		const image = createImageStub({
			getBoundingBox: () => {
				throw new Error('missing metadata');
			},
			getOrigin: () => [Number.NaN, 200],
			getResolution: () => [5, -10]
		});

		expect(parseBboxFromGeoTiffImage(image, 2, 3)).toBeNull();
	});
});
