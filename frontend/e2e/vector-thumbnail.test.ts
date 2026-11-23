import { readFileSync } from 'node:fs';
import { thumbnailStyle } from '../src/routes/map/utils/image/vector/__fixtures__/thumbnail';
import { expect, test } from './map-test';

test('アップロードした点・線・面のサムネイルをWASMで生成する', async ({ page }) => {
	const wasmResponses: { url: string; status: number; }[] = [];
	page.on('response', response => {
		const url = new URL(response.url());
		if (
			url.pathname.includes('ml2drender_wasm') && url.pathname.endsWith('.wasm')
			&& !url.searchParams.has('url')
		) {
			wasmResponses.push({ url: response.url(), status: response.status() });
		}
	});
	await page.route('**/sprite/sprite*.json', route => route.fulfill({ json: {} }));
	await page.route('**/sprite/sprite*.png', route => route.fulfill({ status: 404 }));
	await page.route('**/assets/street_view/*', async route => {
		if (new URL(route.request().url()).pathname.endsWith('.fgb')) {
			await route.fulfill({
				contentType: 'application/octet-stream',
				body: readFileSync(
					new URL(
						'../src/routes/map/utils/formats/video/__fixtures__/test-empty.fgb',
						import.meta.url
					)
				)
			});
		} else await route.fulfill({ contentType: 'application/json', body: '{}' });
	});
	await page.goto('map?c=0_0&z=5&p=0&b=0', { waitUntil: 'domcontentloaded' });
	const canvas = page.locator('canvas.maplibregl-canvas:visible').first();
	await canvas.waitFor();
	const source = thumbnailStyle.sources['test-vector'];
	if (
		source.type !== 'geojson' || typeof source.data === 'string'
		|| source.data.type !== 'FeatureCollection'
	) {
		throw new Error('Invalid test fixture');
	}
	for (const feature of source.data.features) {
		const name = `test-thumbnail-${feature.geometry.type}`;
		await expect.poll(() =>
			canvas.evaluate(element => {
				const rect = element.getBoundingClientRect();
				return !!document.elementFromPoint(
					rect.left + rect.width / 2,
					rect.top + rect.height / 2
				)
					?.closest('[role="region"]');
			})
		).toBe(true);
		await canvas.evaluate((element, { feature, name }) => {
			const transfer = new DataTransfer();
			transfer.items.add(
				new File(
					[
						JSON.stringify({ type: 'FeatureCollection', features: [feature] })
					],
					`${name}.geojson`,
					{ type: 'application/geo+json' }
				)
			);
			element.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true }));
		}, { feature, name });
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		const thumbnail = page.getByRole('img', { name, exact: true }).first();
		await expect(thumbnail).toBeVisible();
		await expect.poll(() =>
			thumbnail.evaluate(element => {
				const image = element as HTMLImageElement;
				return [image.naturalWidth, image.naturalHeight];
			})
		).toEqual([512, 512]);
		const painted = await thumbnail.evaluate(async element => {
			const image = element as HTMLImageElement;
			const response = await fetch(image.src);
			const blob = await response.blob();
			const canvas = document.createElement('canvas');
			canvas.width = image.naturalWidth;
			canvas.height = image.naturalHeight;
			const context = canvas.getContext('2d')!;
			context.drawImage(image, 0, 0);
			const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
			return {
				type: blob.type,
				hasGeometry: pixels.some((value, index) => index % 4 === 3 && value > 0)
			};
		});
		expect(painted).toEqual({ type: 'image/webp', hasGeometry: true });
	}
	expect(wasmResponses).toHaveLength(1);
	expect(wasmResponses[0].status).toBe(200);
	expect(wasmResponses[0].url).not.toContain('/node_modules/.vite/wasm/');
	await expect(page.locator('[id^="map-instance-"]')).toHaveCount(0);
});
