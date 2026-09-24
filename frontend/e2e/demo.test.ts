import { expect, test } from '@playwright/test';

test('ホームに地図を開くボタンが表示される', async ({ page }) => {
	await page.goto('./');
	await expect(page.getByRole('button', { name: 'マップを見る', exact: true })).toBeVisible();
});
