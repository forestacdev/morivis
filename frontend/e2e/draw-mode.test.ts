import { expect, type Page, test } from './map-test';

const openDraw = async (page: Page) => {
	await page.getByRole('button', { name: 'その他のメニュー', exact: true }).click();
	await page.getByRole('button', { name: 'ドローモード', exact: true }).click();
	await expect(page.getByRole('button', { name: 'ドローモード', exact: true })).toBeHidden();
	await expect(page.getByRole('button', { name: 'ポイント', exact: true })).toBeEnabled();
};
const exportDrawing = async (page: Page) => {
	const download = page.waitForEvent('download');
	await page.getByRole('button', { name: 'GeoJSONをエクスポート' }).click();
	const stream = await (await download).createReadStream();
	const chunks = [];
	for await (const chunk of stream!) chunks.push(chunk);
	return JSON.parse(Buffer.concat(chunks).toString());
};

test('描画・再入場・移動・色変更・削除・出力を行える', async ({ page }) => {
	test.setTimeout(120_000);
	const errors: string[] = [];
	page.on('pageerror', error => {
		errors.push(error.message);
		console.error(error.message);
	});
	await page.goto('map?c=2.500000_1.250000&z=14&p=0&b=0', { waitUntil: 'domcontentloaded' });
	const canvas = page.locator('canvas.maplibregl-canvas:visible').first();
	await expect(canvas).toBeVisible({ timeout: 60_000 });
	await openDraw(page);
	await page.keyboard.press('Delete'); // 未選択でも例外にならない。
	await page.getByRole('button', { name: 'ポイント', exact: true }).click();
	const bounds = (await canvas.boundingBox())!;
	const point = { x: bounds.x + bounds.width * 0.3, y: bounds.y + bounds.height * 0.45 };
	await page.mouse.click(point.x, point.y);
	await expect(page.getByText('作成済み: 1件')).toBeVisible();
	await page.getByRole('button', { name: '矩形', exact: true }).click();
	await page.mouse.click(point.x + 50, point.y + 50);
	await page.mouse.move(point.x + 140, point.y + 130);
	await page.mouse.click(point.x + 140, point.y + 130);
	await expect(page.getByText('作成済み: 2件')).toBeVisible();
	const before = await exportDrawing(page);
	expect(
		before.features.map((feature: { geometry: { type: string; }; }) => feature.geometry.type)
	).toEqual(['Point', 'Polygon']);
	await page.getByRole('button', { name: '終了', exact: true }).click();
	await expect(page.getByRole('region', { name: 'ドローモード' })).toBeHidden();
	await openDraw(page);
	await expect(page.getByText('作成済み: 2件')).toBeVisible();
	await page.mouse.click(point.x, point.y);
	await expect(page.getByRole('button', { name: '選択した図形を削除' })).toBeEnabled();
	await page.mouse.move(point.x, point.y);
	await page.mouse.down();
	await page.mouse.move(point.x + 25, point.y - 25, { steps: 8 });
	await page.mouse.up();
	await page.getByText('色の選択', { exact: true }).click();
	await page.getByRole('textbox', { name: 'hex color', exact: true }).fill('#00ff00');
	await page.getByRole('heading', { name: 'ドローモード' }).click();
	const moved = await exportDrawing(page);
	expect(moved.features[0].geometry.coordinates).not.toEqual(
		before.features[0].geometry.coordinates
	);
	await page.getByRole('button', { name: '選択した図形を削除' }).click();
	await expect(page.getByText('作成済み: 1件')).toBeVisible();
	const after = await exportDrawing(page);
	expect(after.features).toHaveLength(1);
	expect(after.features[0].geometry.type).toBe('Polygon');
	// 未確定の図形を終了時に保存しない。
	await page.getByRole('button', { name: 'ライン', exact: true }).click();
	await page.mouse.click(point.x, point.y);
	await page.mouse.move(point.x + 20, point.y + 20);
	await page.keyboard.press('Escape');
	await expect(page.getByText('作成済み: 1件')).toBeVisible();
	await page.getByRole('button', { name: '終了', exact: true }).click();
	await openDraw(page);
	await expect(page.getByText('作成済み: 1件')).toBeVisible();
	await page.screenshot({ path: 'test-results/draw-mode.png' });
	expect(errors).toEqual([]);
});
