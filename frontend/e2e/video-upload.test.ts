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

for (
	const fixture of [
		{
			path: 'video/__fixtures__/test-pattern.webm',
			input: 'test-pattern.webm',
			output: 'test-pattern.webm',
			width: 64,
			mime: 'video/webm'
		},
		{
			path: 'gif/__fixtures__/test-animation.gif',
			input: 'test-animation.gif',
			output: 'test-animation.mp4',
			width: 66,
			mime: 'image/gif'
		}
	]
) {
	test(`${fixture.input}をドロップし、位置合わせ後に地図上で再生する`, async ({ page }) => {
		test.setTimeout(180_000);
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
					`../src/routes/map/utils/formats/${fixture.path}`,
					import.meta.url
				)
			)
		];
		await mapCanvas.evaluate((canvas, { bytes, fixture }) => {
			const transfer = new DataTransfer();
			transfer.items.add(
				new File([new Uint8Array(bytes)], fixture.input, { type: fixture.mime })
			);
			canvas.dispatchEvent(
				new DragEvent('drop', { dataTransfer: transfer, bubbles: true })
			);
		}, { bytes, fixture });
		await expect(page.getByText(`ファイル: ${fixture.output}`, { exact: true })).toBeVisible({
			timeout: 150_000
		});
		await page.getByRole('button', { name: '決定', exact: true }).click();
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await page.waitForFunction((width) => {
			const videos = (window as unknown as { testVideos: HTMLVideoElement[]; }).testVideos;
			return videos.some(video =>
				!video.paused && video.currentTime > 0 && video.videoWidth === width
			);
		}, fixture.width);
		const result = await page.evaluate(async () => {
			const video = (window as unknown as { testVideos: HTMLVideoElement[]; }).testVideos
				.find(
					video => !video.paused
				)!;
			const start = video.currentTime;
			await new Promise(resolve => setTimeout(resolve, 300));
			return { muted: video.muted, loop: video.loop, moving: start !== video.currentTime };
		});
		expect(result).toEqual({ muted: true, loop: true, moving: true });
		if (fixture.mime === 'image/gif') {
			const decoded = await page.evaluate(async () => {
				const video = (window as unknown as { testVideos: HTMLVideoElement[]; }).testVideos
					.find(video => !video.paused)!;
				video.pause();
				const canvas = document.createElement('canvas');
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				const context = canvas.getContext('2d')!;
				const frames = [];
				for (const time of [0.1, 0.3, 0.8]) {
					await new Promise<void>(resolve => {
						video.onseeked = () => resolve();
						video.currentTime = time;
					});
					context.drawImage(video, 0, 0);
					frames.push({
						background: [...context.getImageData(2, 2, 1, 1).data],
						center: [...context.getImageData(32, 24, 1, 1).data]
					});
				}
				return { duration: video.duration, height: video.videoHeight, frames };
			});
			expect(decoded.duration).toBeCloseTo(1, 1);
			expect(decoded.height).toBe(50);
			for (const [index, frame] of decoded.frames.entries()) {
				expect(frame.background.slice(0, 3).every(value => value > 240)).toBe(true);
				expect(frame.background[3]).toBe(255);
				const channel = [0, 2, 1][index];
				expect(frame.center[channel]).toBeGreaterThan(220);
				expect(
					frame.center.slice(0, 3).filter((_, i) => i !== channel).every(value =>
						value < 30
					)
				).toBe(true);
			}
		}
	});
}

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
