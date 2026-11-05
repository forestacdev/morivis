import { expect, test } from './map-test';

test.use({ serviceWorkers: 'block' });

type SheetState = {
	created: number;
	terminated: number;
	completed: number;
	errors: string[];
};

test('地形図図郭の縮尺切替と表示の解除・再表示', async ({ page, context }) => {
	test.setTimeout(90_000);
	const errors: string[] = [];
	const scales: number[] = [];
	const nativeZooms: number[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await context.route('**/*', async route => {
		const url = new URL(route.request().url());
		if (url.hostname === 'maps.gsi.go.jp' && /\/xyz\/zk\d+\//.test(url.pathname)) {
			const match = /\/xyz\/zk(\d+)\/(\d+)\//.exec(url.pathname)!;
			scales.push(Number(match[1]));
			if (match[1] === '25000') nativeZooms.push(Number(match[2]));
			// 全タイルに同じ架空の図郭を返し、隣接タイルの重複除去も通す。
			const point = url.pathname.includes('zk25000');
			await route.fulfill({
				json: {
					type: 'FeatureCollection',
					features: [{
						type: 'Feature',
						properties: point
							? { 図名: 'test-図郭', 図郭座標: [[0.98, 0.98], [1.02, 1.02]] }
							: { name: 'test-sheet' },
						geometry: point ? { type: 'Point', coordinates: [1, 1] } : {
							type: 'Polygon',
							coordinates: [[[0.98, 0.98], [1.02, 0.98], [1.02, 1.02], [0.98, 1.02], [
								0.98,
								0.98
							]]]
						}
					}]
				}
			});
		} else if (
			url.hostname === '127.0.0.1' || url.hostname === 'test.invalid'
			|| url.pathname.endsWith('/morivis_satellite.json')
		) {
			await route.fallback();
		} else await route.abort();
	});
	await page.addInitScript(() => {
		const state: SheetState = {
			created: 0,
			terminated: 0,
			completed: 0,
			errors: []
		};
		(window as typeof window & { testSheets: SheetState; }).testSheets = state;
		window.Worker = new Proxy(window.Worker, {
			construct: (Target, args) => {
				const worker = Reflect.construct(Target, args) as Worker;
				if (!String(args[0]).includes('protocol_geojson.worker')) return worker;
				state.created++;
				worker.addEventListener('message', event => {
					if (event.data.buffer?.byteLength) state.completed++;
					if (event.data.error) state.errors.push(event.data.error);
				});
				worker.addEventListener('error', event => state.errors.push(event.message));
				worker.terminate = new Proxy(worker.terminate, {
					apply: (target, self, params) => {
						state.terminated++;
						return Reflect.apply(target, self, params);
					}
				});
				return worker;
			}
		});
	});
	const state = () =>
		page.evaluate(() => (window as typeof window & { testSheets: SheetState; }).testSheets);
	await page.goto('./map?c=1_1&z=8&p=0&b=0', { waitUntil: 'domcontentloaded' });
	const canvas = page.locator('canvas.maplibregl-canvas:visible').first();
	await expect(canvas).toBeVisible({ timeout: 60_000 });
	await page.getByRole('button', { name: '背景地図・補助レイヤー', exact: true }).click();
	const toggle = page.locator('label[for="地形図図郭"]');
	await toggle.click();
	await expect(page.locator('input[id="地形図図郭"]')).toBeChecked();
	await expect.poll(async () => ({ ...(await state()), requested: scales.length }), {
		timeout: 15_000
	}).toMatchObject({ completed: expect.any(Number), created: 1 });
	await expect.poll(async () => {
		const current = await state();
		return { ...current, rendered: current.completed > 0 };
	}, { timeout: 15_000 }).toMatchObject({ rendered: true });
	expect(scales).toContain(200000);
	await page.getByRole('button', { name: '背景地図・補助レイヤーを閉じる', exact: true }).click();
	await canvas.hover();
	// 慣性スクロールは1回の入力を1ズーム未満に抑えるため、切替まで段階的に拡大する。
	for (const scale of [50000, 25000]) {
		await expect.poll(async () => {
			const current = [...scales];
			if (!current.includes(scale)) await page.mouse.wheel(0, -700);
			return current;
		}, { intervals: [600], timeout: 10_000 }).toContain(scale);
	}
	await page.getByRole('button', { name: '背景地図・補助レイヤー', exact: true }).click();
	await toggle.click();
	await expect.poll(async () => (await state()).terminated).toBe(1);
	const completed = (await state()).completed;
	await toggle.click();
	await expect.poll(async () => (await state()).created).toBe(2);
	await expect.poll(async () => (await state()).completed).toBeGreaterThan(completed);
	expect(new Set(nativeZooms)).toEqual(new Set([8]));
	expect((await state()).errors).toEqual([]);
	expect(errors).toEqual([]);
});
