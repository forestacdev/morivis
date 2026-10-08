import { readFileSync } from 'node:fs';
import { expect, type Page, test } from './map-test';

const drop = async (
	page: Page,
	name: string,
	extensions = ['tab', 'dat', 'map', 'id'],
	intoDialog = false
) => {
	const files = extensions.map(ext => ({
		name: `${name}.${ext}`,
		bytes: [
			...readFileSync(
				new URL(
					`../src/routes/map/utils/formats/mapinfo-tab/__fixtures__/${name}.${ext}`,
					import.meta.url
				)
			)
		]
	}));
	const target = intoDialog
		? page.getByText('MapInfo TAB', { exact: true })
		: page.locator('canvas.maplibregl-canvas:visible').first();
	await target.evaluate((element, files) => {
		const transfer = new DataTransfer();
		for (const file of files) {
			transfer.items.add(new File([new Uint8Array(file.bytes)], file.name));
		}
		element.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true }));
	}, files);
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

for (const type of ['Point', 'LineString', 'Polygon']) {
	test(`Native TABの${type}を登録し、処理中はスクリーンガードを表示する`, async ({ page }) => {
		let release = () => {};
		const ready = new Promise<void>(resolve => {
			release = resolve;
		});
		await page.route('**/workers/*.js', async route => {
			await ready;
			await route.continue();
		});
		await drop(page, 'test-native');
		try {
			await expect(page.locator('.loader')).toBeVisible();
		} finally {
			release();
		}
		await page.getByLabel('図形の種類').selectOption(type);
		await page.getByRole('button', { name: '決定', exact: true }).click();
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await expect(page.getByText('test-native', { exact: true }).first()).toBeVisible();
		await expect(page.locator('.loader')).toHaveCount(0);
	});
}

test('投影座標と日本語属性を持つTABを自動変換して登録する', async ({ page }) => {
	await drop(page, 'test-projected');
	await page.getByLabel('図形の種類').selectOption('Point');
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-projected', { exact: true }).first()).toBeVisible();
});

test('NonEarthは座標系を選択してから登録する', async ({ page }) => {
	await drop(page, 'test-local');
	await page.getByLabel('図形の種類').selectOption('Polygon');
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await expect(page.getByText(/選択されたEPSGコード:/)).toBeVisible();
	await page.locator('label').filter({ hasText: 'WGS84 / 地理座標系' }).click();
	await page.getByRole('button', { name: '決定', exact: true }).last().click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-local', { exact: true }).first()).toBeVisible();
});

test('不足ファイルの追加ドロップで回復する', async ({ page }) => {
	await drop(page, 'test-native', ['tab']);
	await expect(page.getByRole('alert')).toContainText('DAT');
	await expect(page.locator('.loader')).toHaveCount(0);
	await drop(page, 'test-native', ['dat', 'map', 'id'], true);
	await page.getByLabel('図形の種類').selectOption('LineString');
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toBeVisible();
});

test('NonEarthの図形を手動で位置合わせして登録する', async ({ page }) => {
	await drop(page, 'test-local');
	await page.getByLabel('図形の種類').selectOption('Polygon');
	await page.getByRole('button', { name: '位置合わせ', exact: true }).click();
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-local', { exact: true }).first()).toBeVisible();
});

test('単一種類のTABはそのままエントリー登録へ進む', async ({ page }) => {
	await drop(page, 'test-point');
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toBeVisible();
	await expect(page.getByLabel('図形の種類')).toHaveCount(0);
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-point', { exact: true }).first()).toBeVisible();
});
