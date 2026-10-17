import { createTestFileGdb } from '../src/routes/map/utils/formats/filegdb/__fixtures__/test-tables';
import { expect, test } from './map-test';

test('FileGDBの投影座標をWorkerで読み込み、ポイントを登録する', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await page.goto('map?c=0.022458_0.011229&z=14&p=0&b=0', { waitUntil: 'domcontentloaded' });
	const canvas = page.locator('canvas.maplibregl-canvas:visible').first();
	await canvas.waitFor();
	const files = [...createTestFileGdb()].map(([name, data]) => ({ name, bytes: [...data] }));
	await canvas.evaluate((element, files) => {
		const transfer = new DataTransfer();
		for (const { name, bytes } of files) {
			const file = new File([new Uint8Array(bytes)], name);
			transfer.items.add(file);
		}
		element.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true }));
	}, files);
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByRole('button', { name: 'a00000001 Esri FileGDB', exact: true }))
		.toBeVisible();
	await expect(page.locator('.loader')).toHaveCount(0);
	expect(errors).toEqual([]);
});
