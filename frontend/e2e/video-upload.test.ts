import { readFileSync } from 'node:fs';
import { expect, test } from './map-test';

test.beforeEach(async ({ page }) => {
	// 動画と無関係な初期索引の外部配信にテストを依存させない。
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
		} else {
			await route.fulfill({ contentType: 'application/json', body: '{}' });
		}
	});
});

test('動画をドロップし、位置合わせ後に地図上で再生する', async ({ page }) => {
	await page.addInitScript(() => {
		const videos: HTMLVideoElement[] = [];
		Object.assign(window, { testVideos: videos });
		const createElement = document.createElement.bind(document);
		document.createElement = ((name: string, options?: ElementCreationOptions) => {
			const element = createElement(name, options);
			if (element instanceof HTMLVideoElement) videos.push(element);
			return element;
		}) as typeof document.createElement;
	});
	await page.goto('map');
	const mapCanvas = page.locator('canvas.maplibregl-canvas:visible').first();
	await mapCanvas.waitFor();
	const bytes = [
		...readFileSync(
			new URL(
				'../src/routes/map/utils/formats/video/__fixtures__/test-pattern.webm',
				import.meta.url
			)
		)
	];
	await mapCanvas.evaluate((canvas, bytes) => {
		const transfer = new DataTransfer();
		transfer.items.add(
			new File([new Uint8Array(bytes)], 'test-pattern.webm', { type: 'video/webm' })
		);
		canvas.dispatchEvent(
			new DragEvent('drop', { dataTransfer: transfer, bubbles: true })
		);
	}, bytes);
	await expect(page.getByText('ファイル: test-pattern.webm', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await page.waitForFunction(() => {
		const videos = (window as unknown as { testVideos: HTMLVideoElement[]; }).testVideos;
		return videos.some(video =>
			!video.paused && video.currentTime > 0 && video.videoWidth === 64
		);
	});
	const result = await page.evaluate(async () => {
		const video = (window as unknown as { testVideos: HTMLVideoElement[]; }).testVideos.find(
			video => !video.paused
		)!;
		const start = video.currentTime;
		await new Promise(resolve => setTimeout(resolve, 300));
		return { muted: video.muted, loop: video.loop, moving: start !== video.currentTime };
	});
	expect(result).toEqual({ muted: true, loop: true, moving: true });
});

test('位置情報付き動画は位置合わせをせずポイント登録し、クリックで再生する', async ({ page }) => {
	await page.goto('map?c=2.500000_1.250000&z=14&p=0&b=0', { waitUntil: 'domcontentloaded' });
	const canvas = page.locator('canvas.maplibregl-canvas:visible').first();
	await canvas.waitFor();
	const bytes = [
		...readFileSync(
			new URL(
				'../src/routes/map/utils/formats/video/__fixtures__/test-location.mp4',
				import.meta.url
			)
		)
	];
	await canvas.evaluate((canvas, bytes) => {
		const transfer = new DataTransfer();
		transfer.items.add(
			new File([new Uint8Array(bytes)], 'test-location.mp4', { type: 'video/mp4' })
		);
		canvas.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true }));
	}, bytes);
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByRole('button', { name: '決定', exact: true })).toHaveCount(0);
	// 撮影地点（画面中央）のポイントを開く。
	const player = page.locator('video:visible').first();
	await expect(async () => {
		await canvas.click();
		await expect(player).toBeVisible({ timeout: 1000 });
	}).toPass({ timeout: 15000 });
	await player.evaluate(async (video: HTMLVideoElement) => {
		video.muted = true;
		await video.play();
	});
	await expect.poll(() => player.evaluate((video: HTMLVideoElement) => video.currentTime))
		.toBeGreaterThan(0);
});
