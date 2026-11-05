import { expect, type Page, test } from './map-test';

const openDraw = async (page: Page) => {
	await page.getByRole('button', { name: 'その他のメニュー', exact: true }).click();
	await page.getByRole('button', { name: 'ドローモード', exact: true }).click();
	await expect(page.getByRole('button', { name: 'ドローモード', exact: true })).toBeHidden();
	await expect(page.getByRole('button', { name: 'ポイント', exact: true })).toBeEnabled({
		timeout: 15_000
	});
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
	expect(moved.features.map((feature: { id: string; }) => feature.id)).toEqual(
		before.features.map((feature: { id: string; }) => feature.id)
	);
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

// WebGLの実際の合成結果を確認し、style配列だけの検証にしない。
const drawingPixel = async (page: Page, x: number, y: number) => {
	const canvas = page.locator('canvas.maplibregl-canvas:visible').first();
	const png = (await canvas.screenshot()).toString('base64');
	return page.evaluate(async ({ png, x, y }) => {
		const image = new Image();
		image.src = `data:image/png;base64,${png}`;
		await image.decode();
		const target = document.createElement('canvas');
		target.width = image.width;
		target.height = image.height;
		const ctx = target.getContext('2d')!;
		ctx.drawImage(image, 0, 0);
		return [...ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data];
	}, { png, x, y });
};

const setDrawingColor = async (page: Page, color: string) => {
	await page.getByText('色の選択', { exact: true }).click();
	await page.getByRole('textbox', { name: 'hex color', exact: true }).fill(color);
	await page.getByRole('heading', { name: 'ドローモード' }).click();
};

test('後から描いた面・線が点より上に重なり、終了・再入場でも順番を保つ', async ({ page }) => {
	test.setTimeout(120_000);
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await page.goto('map?c=2.500000_1.250000&z=14&p=0&b=0', { waitUntil: 'domcontentloaded' });
	const canvas = page.locator('canvas.maplibregl-canvas:visible').first();
	await expect(canvas).toBeVisible({ timeout: 60_000 });
	await openDraw(page);
	const bounds = (await canvas.boundingBox())!;
	const x = Math.round(bounds.width * 0.3);
	const y = Math.round(bounds.height * 0.45);
	const point = { x: bounds.x + x, y: bounds.y + y };
	await page.getByRole('button', { name: 'ポイント', exact: true }).click();
	await page.mouse.click(point.x, point.y);
	await expect(page.getByText('作成済み: 1件')).toBeVisible();
	await expect.poll(async () => {
		const [r, g, b] = await drawingPixel(page, x, y);
		return r > 220 && g < 30 && b < 30;
	}).toBe(true);
	await page.getByRole('button', { name: '矩形', exact: true }).click();
	await setDrawingColor(page, '#0000ff');
	await page.mouse.click(point.x - 40, point.y - 40);
	await page.mouse.move(point.x + 40, point.y + 40);
	await page.mouse.click(point.x + 40, point.y + 40);
	await expect(page.getByText('作成済み: 2件')).toBeVisible();
	await page.keyboard.press('Escape');
	const expectBlueOverRed = async () => {
		await expect.poll(async () => {
			const [r, , b] = await drawingPixel(page, x, y);
			return r > 100 && r < 220 && b > 60;
		}, { timeout: 15_000 }).toBe(true);
	};
	await expectBlueOverRed();
	await page.getByRole('button', { name: '終了', exact: true }).click();
	await expectBlueOverRed();
	await openDraw(page);
	await expectBlueOverRed();
	await page.getByRole('button', { name: 'ライン', exact: true }).click();
	await setDrawingColor(page, '#00ff00');
	await page.mouse.click(point.x - 60, point.y);
	await page.mouse.move(point.x + 60, point.y);
	const expectGreen = async () => {
		await expect.poll(async () => {
			const [r, g, b] = await drawingPixel(page, x, y);
			return r < 30 && g > 220 && b < 30;
		}, { timeout: 15_000 }).toBe(true);
	};
	await expectGreen();
	await page.mouse.dblclick(point.x + 60, point.y);
	await expect(page.getByText('作成済み: 3件')).toBeVisible();
	await page.keyboard.press('Escape');
	await expectGreen();
	await page.getByRole('button', { name: '終了', exact: true }).click();
	await expectGreen();
	await openDraw(page);
	await expectGreen();
	expect(errors).toEqual([]);
});
