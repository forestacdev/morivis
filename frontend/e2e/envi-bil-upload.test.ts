import { expect, type Page, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const dropFiles = async (page: Page, names: string[], noPlacement = false) => {
	const files = names.map(name => {
		let buffer = readFileSync(
			new URL(
				`../src/routes/map/utils/formats/envi-bil/__fixtures__/${name}`,
				import.meta.url
			)
		);
		if (noPlacement && name.endsWith('.hdr')) {
			buffer = Buffer.from(buffer.toString().replace(/map info = .*\n/, ''));
		}
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
		['test-color', ['test-color.hdr', 'test-color.bil']],
		['test-height', ['test-height.hdr', 'test-height.bil', 'test-height.prj']]
	] as const
) {
	test(`${name}: スクリーンガードを出し、そのままエントリー登録へ進む`, async ({ page }) => {
		let releaseWorker = () => {};
		const ready = new Promise<void>(resolve => {
			releaseWorker = resolve;
		});
		await page.route('**/workers/*.js', async route => {
			await ready;
			await route.continue();
		});
		await dropFiles(page, [...names]);
		try {
			await expect(page.locator('.loader')).toBeVisible();
		} finally {
			releaseWorker();
		}
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
		await expect(page.locator('.loader')).toHaveCount(0);
	});
}

test('座標系不明なら選択フォーム、確定後はエントリー登録へ進む', async ({ page }) => {
	await dropFiles(page, ['test-height.hdr', 'test-height.bil']);
	await expect(page.getByText(/選択されたEPSGコード:/)).toBeVisible();
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toHaveCount(0);
	await page.locator('label').filter({ hasText: 'WGS84 / 地理座標系' }).click();
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-height', { exact: true }).first()).toBeVisible();
});

test('位置のない画像は地図上で位置合わせして登録する', async ({ page }) => {
	await dropFiles(page, ['test-color.hdr', 'test-color.bil'], true);
	await expect(page.getByRole('button', { name: '決定', exact: true })).toBeVisible();
	await expect(page.getByText(/選択されたEPSGコード:/)).toHaveCount(0);
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-color', { exact: true }).first()).toBeVisible();
});

test('本体の欠落を表示し、一式を選び直して回復できる', async ({ page }) => {
	await dropFiles(page, ['test-color.hdr']);
	await expect(page.getByRole('alert')).toContainText('画像本体');
	await expect(page.locator('.loader')).toHaveCount(0);
	await page.getByLabel('ファイル一式を選び直す').setInputFiles(
		['test-color.hdr', 'test-color.bil'].map(name => ({
			name,
			mimeType: 'application/octet-stream',
			buffer: readFileSync(
				new URL(
					`../src/routes/map/utils/formats/envi-bil/__fixtures__/${name}`,
					import.meta.url
				)
			)
		}))
	);
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toBeVisible();
});
