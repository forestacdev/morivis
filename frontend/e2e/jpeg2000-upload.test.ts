import { readFileSync } from 'node:fs';
import { expect, type Page, test } from './map-test';

const dropFiles = async (page: Page, names: string[]) => {
	const files = names.map(name => {
		const buffer = readFileSync(
			new URL(
				`../src/routes/map/utils/formats/jpeg2000/__fixtures__/${name}`,
				import.meta.url
			)
		);
		return { name, bytes: [...buffer] };
	});
	await page.locator('canvas.maplibregl-canvas:visible').first().evaluate((canvas, files) => {
		const transfer = new DataTransfer();
		for (const file of files) {
			transfer.items.add(new File([new Uint8Array(file.bytes)], file.name));
		}
		canvas.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true }));
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

for (
	const [name, names] of [
		['test-geojp2', ['test-geojp2.jp2']],
		['test-height', ['test-height.jp2']],
		['test-projected', ['test-projected.jp2']],
		['test-color', ['test-color.jp2', 'test-color.j2w', 'test-color.prj']]
	] as const
) {
	test(`${name}: 処理中はガードを表示し、そのまま登録へ進む`, async ({ page }) => {
		let release = () => {};
		const ready = new Promise<void>(resolve => {
			release = resolve;
		});
		await page.route('**/workers/*.js', async route => {
			await ready;
			await route.continue();
		});
		await dropFiles(page, [...names]);
		try {
			await expect(page.locator('.loader')).toBeVisible();
		} finally {
			release();
		}
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
		await expect(page.locator('.loader')).toHaveCount(0);
	});
}

test('座標系不明のGeoJP2は座標系を選んで登録する', async ({ page }) => {
	await dropFiles(page, ['test-unknown.jp2']);
	await expect(page.getByText(/選択されたEPSGコード:/)).toBeVisible();
	await page.locator('label').filter({ hasText: 'WGS84 / 地理座標系' }).click();
	await page.getByRole('button', { name: '決定', exact: true }).last().click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-unknown', { exact: true }).first()).toBeVisible();
});

test('位置のないJP2は画像を位置合わせして登録する', async ({ page }) => {
	await dropFiles(page, ['test-color.jp2']);
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-color', { exact: true }).first()).toBeVisible();
	await expect(page.locator('.loader')).toHaveCount(0);
});

test('壊れたJP2はエラーを表示しガードを解除する', async ({ page }) => {
	await page.locator('canvas.maplibregl-canvas:visible').first().evaluate(canvas => {
		const transfer = new DataTransfer();
		transfer.items.add(new File(['test-invalid'], 'test-invalid.jp2'));
		canvas.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true }));
	});
	await expect(page.getByRole('alert')).toContainText('JP2');
	await expect(page.locator('.loader')).toHaveCount(0);
});

test('未対応のアルファ付きJP2は通知してガードを解除する', async ({ page }) => {
	await dropFiles(page, ['test-alpha.jp2']);
	await expect(page.getByRole('alert')).toContainText('アルファ');
	await expect(page.locator('.loader')).toHaveCount(0);
});
