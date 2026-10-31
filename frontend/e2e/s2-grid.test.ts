import { expect, test } from './map-test';

test.use({ serviceWorkers: 'block' });

type S2State = {
	created: number;
	terminated: number;
	completed: number;
	levels: number[];
	errors: string[];
};

test('S2補助レイヤーはズーム連動し、非表示時にWorkerを解放して再表示できる', async ({ page }) => {
	test.setTimeout(90_000);
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await page.route('**/*', async route => {
		const url = new URL(route.request().url());
		if (
			url.hostname === '127.0.0.1' || url.hostname === 'test.invalid'
			|| url.pathname.endsWith('/morivis_satellite.json')
		) {
			await route.fallback();
		} else await route.abort();
	});
	await page.addInitScript(() => {
		const state: S2State = { created: 0, terminated: 0, completed: 0, levels: [], errors: [] };
		(window as typeof window & { testS2: S2State; }).testS2 = state;
		window.Worker = new Proxy(window.Worker, {
			construct: (Target, args) => {
				const worker = Reflect.construct(Target, args) as Worker;
				if (!String(args[0]).includes('s2.worker')) return worker;
				state.created++;
				worker.addEventListener('message', event => {
					if (event.data.data?.byteLength) state.completed++;
					if (event.data.error) state.errors.push(event.data.error);
				});
				worker.addEventListener('error', event => state.errors.push(event.message));
				worker.postMessage = new Proxy(worker.postMessage, {
					apply: (target, self, params) => {
						state.levels.push(params[0].level);
						return Reflect.apply(target, self, params);
					}
				});
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
		page.evaluate(() => (window as typeof window & { testS2: S2State; }).testS2);
	await page.goto('./map?c=1_1&z=4&p=0&b=0', { waitUntil: 'domcontentloaded' });
	const canvas = page.locator('canvas.maplibregl-canvas:visible').first();
	await expect(canvas).toBeVisible({ timeout: 60_000 });
	await page.getByRole('button', { name: '背景地図・補助レイヤー', exact: true }).click();
	const toggle = page.locator('label[for="S2"]');
	await toggle.click();
	await expect(page.locator('input[id="S2"]')).toBeChecked();
	await expect.poll(async () => (await state()).completed).toBeGreaterThan(0);
	const initial = await state();
	await page.getByRole('button', { name: '背景地図・補助レイヤーを閉じる', exact: true }).click();
	await canvas.hover();
	await page.mouse.wheel(0, -700);
	await page.mouse.wheel(0, -700);
	await expect.poll(async () =>
		(await state()).levels.some(level => level > Math.max(...initial.levels))
	).toBe(true);
	// 地図を操作するとメニューが閉じるため、再度開く。
	if (!(await toggle.isVisible())) {
		await page.getByRole('button', { name: '背景地図・補助レイヤー', exact: true }).click();
	}
	await toggle.click();
	await expect(page.locator('input[id="S2"]')).not.toBeChecked();
	await expect.poll(async () => (await state()).terminated).toBe(1);
	const before = (await state()).completed;
	await toggle.click();
	await expect.poll(async () => (await state()).created).toBe(2);
	await expect.poll(async () => (await state()).completed).toBeGreaterThan(before);
	expect((await state()).errors).toEqual([]);
	expect(errors).toEqual([]);
});
