import { readFileSync } from 'node:fs';
import { expect, type Page, test } from './map-test';

const dropFixture = async (page: Page, name: string) => {
	const bytes = [
		...readFileSync(
			new URL(`../src/routes/map/utils/formats/fit/__fixtures__/${name}.fit`, import.meta.url)
		)
	];
	const canvas = page.locator('canvas.maplibregl-canvas:visible').first();
	await canvas.evaluate((canvas, { bytes, name }) => {
		const transfer = new DataTransfer();
		transfer.items.add(new File([new Uint8Array(bytes)], `${name}.fit`));
		canvas.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true }));
	}, { bytes, name });
};

test.beforeEach(async ({ page }) => {
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
	await page.goto('map?c=2.500000_1.250000&z=14&p=0&b=0', { waitUntil: 'domcontentloaded' });
	await page.locator('canvas.maplibregl-canvas:visible').first().waitFor();
});

for (const type of ['軌跡（線）', '計測点（時刻・標高・センサー値）']) {
	test(`FITをWorkerで解析し、${type}を地図へ登録する`, async ({ page }) => {
		let releaseWorker = () => {};
		const ready = new Promise<void>(resolve => {
			releaseWorker = resolve;
		});
		await page.route('**/workers/*.js', async route => {
			await ready;
			await route.continue();
		});
		await dropFixture(page, 'test-track');
		await expect(page.getByText('FITファイルの登録', { exact: true })).toBeVisible();
		try {
			await expect(page.locator('.loader')).toBeVisible();
			await expect(page.getByRole('button', { name: '決定', exact: true })).toBeDisabled();
		} finally {
			releaseWorker();
		}
		await page.getByRole('radio', { name: new RegExp(type.replace(/[（）]/g, '\\$&')) })
			.check();
		await page.getByRole('button', { name: '決定', exact: true }).click();
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await expect(page.getByText('FITファイルの登録', { exact: true })).toHaveCount(0);
		await expect(page.getByText('test-track', { exact: true }).first()).toBeVisible();
	});
}

test('位置のないFITは理由を表示し、キャンセル後は別ファイルを読み込める', async ({ page }) => {
	await dropFixture(page, 'test-no-gps');
	await expect(page.getByRole('alert')).toContainText('位置情報がありません');
	await expect(page.getByRole('button', { name: '決定', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	await dropFixture(page, 'test-single');
	await expect(page.getByRole('radio', { name: /計測点/ })).toBeChecked();
	await expect(page.getByRole('button', { name: '決定', exact: true })).toBeEnabled();
});
