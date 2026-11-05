import { expect, test } from './map-test';

test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
	await page.route('**/*', async route => {
		const url = new URL(route.request().url());
		if (
			url.hostname === '127.0.0.1' || url.hostname === 'test.invalid'
			|| url.pathname.endsWith('/morivis_satellite.json')
		) await route.fallback();
		else await route.abort();
	});
});

test('PCのデータメニューを戻る・進むで復元する', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await page.goto('./map?c=0_0&z=1&p=0&b=0', { waitUntil: 'domcontentloaded' });
	const catalog = page.getByText('データカタログ', { exact: true });
	await page.getByRole('button', { name: 'データ一覧を見る', exact: true }).click();
	await expect(catalog).toBeVisible();
	await page.goBack();
	await expect(catalog).toBeHidden();
	await page.goForward();
	await expect(catalog).toBeVisible();
	expect(errors).toEqual([]);
});

test.describe('モバイルのメニュー履歴', () => {
	test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
	test('メニュー間の移動後も一度の戻るで地図へ戻り、進むで復元する', async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', error => errors.push(error.message));
		await page.goto('./map?c=0_0&z=1&p=0&b=0', { waitUntil: 'domcontentloaded' });
		const map = page.getByRole('button', { name: '地図', exact: true });
		const data = page.getByRole('button', { name: 'データ', exact: true });
		await expect(map.locator('.bg-accent')).toBeVisible();
		await page.getByRole('button', { name: 'レイヤ', exact: true }).click();
		await data.click();
		await expect(data.locator('.bg-accent')).toBeVisible();
		await page.goBack();
		await expect(map.locator('.bg-accent')).toBeVisible();
		await page.goForward();
		await expect(data.locator('.bg-accent')).toBeVisible();
		expect(errors).toEqual([]);
	});
});
