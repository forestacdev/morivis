import { expect, test } from '@playwright/test';

test('ホームのアイコンは外部アイコンAPIなしでSVGを表示する', async ({ page }) => {
	const iconRequests: string[] = [];
	await page.route(
		/https:\/\/[^/]*(?:iconify\.design|simplesvg\.com|unisvg\.com)\//,
		async route => {
			iconRequests.push(route.request().url());
			await route.abort();
		}
	);
	await page.goto('./', { waitUntil: 'domcontentloaded' });
	const github = page.locator('a[href*="github.com"] svg').first();
	await expect(github).toBeVisible();
	await expect(github.locator('path')).not.toHaveCount(0);
	await expect(github).toHaveAttribute('viewBox', '0 0 24 24');
	expect(iconRequests).toEqual([]);
});
