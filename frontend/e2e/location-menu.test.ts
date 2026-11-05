import sharp from 'sharp';
import { expect, test } from './map-test';

test.use({ serviceWorkers: 'block' });
test.setTimeout(120_000);

test.beforeEach(async ({ page }) => {
	// 手作りのTerrarium画素: 100.5m。外部配信には接続しない。
	const tile = await sharp({
		create: { width: 512, height: 512, channels: 3, background: { r: 128, g: 100, b: 128 } }
	}).webp({ lossless: true }).toBuffer();
	await page.route('**/*', async route => {
		const url = new URL(route.request().url());
		if (url.hostname === 'tiles.mapterhorn.com') {
			await route.fulfill({
				contentType: 'image/webp',
				headers: { 'Access-Control-Allow-Origin': '*' },
				body: tile
			});
		} else if (
			url.hostname === '127.0.0.1' || url.hostname === 'test.invalid'
			|| url.pathname.endsWith('/morivis_satellite.json')
		) await route.fallback();
		else await route.abort();
	});
	await page.goto('./map?c=0_0&z=1&p=0&b=0', { waitUntil: 'domcontentloaded' });
	await expect(page.locator('canvas.maplibregl-canvas:visible').first()).toBeVisible({
		timeout: 60_000
	});
});

test('PCの右クリックは地点の横にメニューを表示する', async ({ page }) => {
	await page.locator('canvas.maplibregl-canvas:visible').first().click({
		button: 'right',
		position: { x: 300, y: 250 }
	});
	await expect(page.getByRole('button', { name: '標高: 100.5 m', exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: '地点情報' })).toHaveCount(0);
});

test.describe('スマホの地点情報カード', () => {
	test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
	test(
		'長押しで開き、指を離しても保持し、閉じて再度開ける',
		async ({ page, context }, testInfo) => {
			const errors: string[] = [];
			page.on('pageerror', error => errors.push(error.message));
			const session = await context.newCDPSession(page);
			const canvas = page.locator('canvas.maplibregl-canvas:visible').first();
			const bounds = await canvas.boundingBox();
			if (!bounds) throw new Error('Map canvas missing');
			const point = { x: bounds.x + bounds.width / 3, y: bounds.y + 300 };
			const heading = page.getByRole('heading', { name: '地点情報', exact: true });
			const press = async () => {
				await session.send('Input.dispatchTouchEvent', {
					type: 'touchStart',
					touchPoints: [point]
				});
				await expect(heading).toBeVisible();
				await session.send('Input.dispatchTouchEvent', {
					type: 'touchEnd',
					touchPoints: []
				});
			};
			await press();
			await expect(page.getByRole('button', { name: '標高: 100.5 m', exact: true }))
				.toBeVisible();
			await expect(heading).toBeVisible();
			// POIと同じく、選択地点がカードより上の中央へ移動する。
			const marker = page.locator('.maplibregl-marker').filter({
				has: page.locator('.c-ripple-effect')
			});
			await expect.poll(async () => {
				const position = await marker.boundingBox();
				if (!position) return Infinity;
				return Math.hypot(
					position.x + position.width / 2 - (bounds.x + bounds.width / 2),
					position.y + position.height / 2 - (bounds.y + bounds.height / 4)
				);
			}).toBeLessThan(3);
			const card = page.locator('dialog').filter({ has: heading });
			const cardBounds = await card.boundingBox();
			expect(cardBounds?.width).toBeGreaterThan(350);
			await page.screenshot({ path: testInfo.outputPath('location-card-mobile.png') });
			await page.getByRole('button', { name: '地点情報を閉じる' }).tap();
			await expect(heading).toHaveCount(0);
			await press();
			await expect(heading).toBeVisible();
			expect(errors).toEqual([]);
		}
	);
});
