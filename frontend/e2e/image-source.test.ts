import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('微小範囲のDEM画像を地図上に描画する', async ({ page }) => {
	await page.route('https://test.invalid/**', async route => {
		const name = new URL(route.request().url()).pathname.slice(1);
		if (/^maplibre-gl(?:-shared|-worker)?\.(?:mjs|css)$/.test(name)) {
			await route.fulfill({
				contentType: name.endsWith('.css') ? 'text/css' : 'text/javascript',
				body: readFileSync(
					new URL(`../node_modules/maplibre-gl/dist/${name}`, import.meta.url)
				)
			});
		} else {
			await route.fulfill({
				contentType: 'text/html',
				body:
					'<!DOCTYPE html><link rel="stylesheet" href="/maplibre-gl.css"><div id="map" style="width:256px;height:256px"></div>'
			});
		}
	});
	await page.goto('https://test.invalid/');
	const result = await page.evaluate(async () => {
		const moduleUrl = 'https://test.invalid/maplibre-gl.mjs';
		const { Map, MercatorCoordinate } = await import(
			/* @vite-ignore */ moduleUrl
		) as typeof import('maplibre-gl');
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = 2;
		const context = canvas.getContext('2d')!;
		context.fillStyle = '#ff0000';
		context.fillRect(0, 0, 2, 2);
		// 通常はz=27となる架空の画像範囲。
		const d = 0.375 * 2 ** -27;
		const coordinates = [
			[0.5 - d, 0.5 - d],
			[0.5 + d, 0.5 - d],
			[0.5 + d, 0.5 + d],
			[0.5 - d, 0.5 + d]
		].map(([x, y]) =>
			new MercatorCoordinate(x, y).toLngLat().toArray()
		) as import('maplibre-gl').Coordinates;
		const errors: string[] = [];
		const map = new Map({
			container: 'map',
			center: [0, 0],
			zoom: 24,
			maxZoom: 25,
			canvasContextAttributes: { preserveDrawingBuffer: true },
			style: {
				version: 8,
				sources: { 'test-dem': { type: 'image', url: canvas.toDataURL(), coordinates } },
				layers: [{
					id: 'test-dem',
					type: 'raster',
					source: 'test-dem',
					paint: { 'raster-fade-duration': 0 }
				}]
			}
		});
		map.on('error', event => errors.push(event.error.message));
		await map.once('idle');
		const source = map.getSource('test-dem') as import('maplibre-gl').ImageSource;
		const gl = map.getCanvas().getContext('webgl2')!;
		const pixel = new Uint8Array(4);
		gl.readPixels(
			gl.drawingBufferWidth / 2,
			gl.drawingBufferHeight / 2,
			1,
			1,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			pixel
		);
		const result = {
			errors,
			pixel: [...pixel],
			zoom: source.tileID.z,
			coordinates: source.coordinates,
			expected: coordinates
		};
		map.remove();
		return result;
	});
	expect(result.errors).toEqual([]);
	expect(result.zoom).toBe(25);
	expect(result.coordinates).toEqual(result.expected);
	expect(result.pixel).toEqual([255, 0, 0, 255]);
});
