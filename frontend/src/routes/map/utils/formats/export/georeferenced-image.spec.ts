import { describe, expect, it } from 'vitest';

import { createRasterEntry } from '$routes/map/data/entries/raster';
import { latToMercY, lngToMercX } from '$routes/map/utils/formats/raster/aux-xml';
import type { GeoRefCorners } from '$routes/map/utils/transform/georef/homography';

import {
	buildImageExportName,
	isExportableGeoreferencedImage,
	rectifyImage
} from './georeferenced-image';

// Synthetic projected coordinates; no real-world input is used.
const toCorners = (points: GeoRefCorners): GeoRefCorners =>
	points.map(([x, y]) => [
		x / 6378137 * 180 / Math.PI,
		(2 * Math.atan(Math.exp(y / 6378137)) - Math.PI / 2) * 180 / Math.PI
	]) as GeoRefCorners;
const pixels = new Uint8ClampedArray([
	255,
	0,
	0,
	255,
	0,
	255,
	0,
	255,
	0,
	0,
	255,
	255,
	0,
	0,
	0,
	0
]);

describe('位置合わせ済み図面画像のダウンロード', () => {
	it('ユーザー登録した画像のみ対象にし、配信タイルは対象にしない', () => {
		const entry = createRasterEntry('test-image', 'data:image/png;base64,dGVzdA==');
		expect(isExportableGeoreferencedImage(entry)).toBe(false);
		entry.metaData.isUserUploaded = true;
		entry.metaData.imageCorners = toCorners([[0, 2], [2, 2], [2, 0], [0, 0]]);
		expect(isExportableGeoreferencedImage(entry)).toBe(true);
		if (entry.format.type !== 'image') throw new Error('test-format');
		entry.format.url = 'https://example.test/{z}/{x}/{y}.png';
		expect(isExportableGeoreferencedImage(entry)).toBe(false);
	});
	it('名前からパス区切りを除き、PNGとZIPの共通名を作る', () => {
		expect(buildImageExportName('test/drawing.png')).toBe('test_drawing');
		expect(buildImageExportName(' .. ')).toBe('drawing');
	});
	it('北向きの画像では元の色・透明度・解像度を維持する', async () => {
		const corners = toCorners([[0, 2], [2, 2], [2, 0], [0, 0]]);
		const result = await rectifyImage(pixels, 2, 2, corners);
		expect([result.width, result.height]).toEqual([2, 2]);
		expect(result.pixels).toEqual(pixels);
		// GDAL's transform origin is the upper-left pixel corner, without a half-pixel offset.
		expect(result.geoTransform[0]).toBe(lngToMercX(corners[0][0]));
		expect(result.geoTransform[3]).toBe(latToMercY(corners[0][1]));
		expect(result.geoTransform[1]).toBeCloseTo(1);
		expect(result.geoTransform[5]).toBeCloseTo(-1);
	});
	it('90度回転した配置を画素にも反映する', async () => {
		const result = await rectifyImage(
			pixels,
			2,
			2,
			toCorners([[2, 2], [2, 0], [0, 0], [0, 2]])
		);
		expect(Array.from(result.pixels)).toEqual([
			0,
			0,
			255,
			255,
			255,
			0,
			0,
			255,
			0,
			0,
			0,
			0,
			0,
			255,
			0,
			255
		]);
	});
	it('台形の四隅を反映し、図面の外側を透明にする', async () => {
		const solid = new Uint8ClampedArray(8 * 8 * 4);
		for (let index = 0; index < solid.length; index += 4) {
			solid[index] = 255;
			solid[index + 3] = 255;
		}
		const result = await rectifyImage(solid, 8, 8, toCorners([[0, 4], [4, 4], [3, 0], [1, 0]]));
		const bottomLeft = ((result.height - 1) * result.width) * 4;
		expect(result.pixels[bottomLeft + 3]).toBe(0);
		const center = (Math.floor(result.height / 2) * result.width + Math.floor(result.width / 2))
			* 4;
		expect(Array.from(result.pixels.slice(center, center + 4))).toEqual([255, 0, 0, 255]);
	});
	it('不正な画像サイズ・潰れた四隅を拒否する', async () => {
		await expect(rectifyImage(pixels, 3, 2, toCorners([[0, 2], [2, 2], [2, 0], [0, 0]])))
			.rejects.toThrow('サイズ');
		await expect(rectifyImage(pixels, 2, 2, [[0, 0], [0, 0], [0, 0], [0, 0]])).rejects.toThrow(
			'位置情報'
		);
	});
});
