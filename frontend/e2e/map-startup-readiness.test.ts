import { expect, type Page, test } from './map-test';

test.use({ serviceWorkers: 'block' });

const referenceStyle = {
	version: 8,
	sources: {
		'test-reference': {
			type: 'vector',
			tiles: ['https://test.invalid/reference/{z}/{x}/{y}.pbf'],
			maxzoom: 0
		}
	},
	layers: [
		{ id: 'test-boundary', type: 'line', source: 'test-reference', 'source-layer': 'boundary' },
		{
			id: 'label-test-place',
			type: 'symbol',
			source: 'test-reference',
			'source-layer': 'place'
		}
	]
};

type StartupState = {
	testLayerIds: string[];
	testWarmups: number;
	testWarmupCompletions: number;
	testReleaseWarmup: (fail?: boolean) => void;
	__morivis_map_idle?: boolean;
};

// 地図が実際に描画Workerへ渡したスタイルを観測する。
const observeStartup = async (page: Page, holdWarmup = false) => {
	await page.addInitScript(({ holdWarmup }) => {
		const state = window as typeof window & StartupState;
		const layers = new Set<string>();
		const pending: ((fail?: boolean) => void)[] = [];
		state.testLayerIds = [];
		state.testWarmups = 0;
		state.testWarmupCompletions = 0;
		state.testReleaseWarmup = (fail) => pending.splice(0).forEach(send => send(fail));
		Worker.prototype.postMessage = new Proxy(Worker.prototype.postMessage, {
			apply: (target, worker: Worker, args) => {
				const message = args[0];
				if (message?.type === 'warmup') {
					state.testWarmups++;
					worker.addEventListener('message', (event) => {
						if (event.data?.type === 'warmup-complete') state.testWarmupCompletions++;
					});
					if (holdWarmup) {
						pending.push((fail) => {
							if (fail) {
								worker.dispatchEvent(
									new MessageEvent('message', {
										data: { type: 'warmup-error', error: 'test-warmup-error' }
									})
								);
							} else Reflect.apply(target, worker, args);
						});
						return;
					}
				}
				if (message?.type === 'SL') {
					layers.clear();
					for (const layer of message.data) layers.add(layer.id);
				}
				if (message?.type === 'UL') {
					for (const id of message.data.removedIds) layers.delete(id);
					for (const layer of message.data.layers) layers.add(layer.id);
				}
				state.testLayerIds = [...layers];
				return Reflect.apply(target, worker, args);
			}
		});
	}, { holdWarmup });
};
const layerIds = (page: Page) =>
	page.evaluate(() => (window as typeof window & StartupState).testLayerIds);
const expectBackground = async (page: Page) => {
	await expect(page.locator('canvas.maplibregl-canvas:visible').first()).toBeVisible();
	await expect.poll(() => layerIds(page)).toContain('base_map_usgs_layer');
	await expect.poll(() =>
		page.evaluate(() => (window as typeof window & StartupState).__morivis_map_idle)
	).toBe(true);
};
const openMap = (page: Page) =>
	page.goto('./map?c=0_0&z=1&p=0&b=0', { waitUntil: 'domcontentloaded' });
const toggleRoads = (page: Page) => page.locator('label[for="道路・線路・境界"]').click();

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

test('補助スタイルの取得中でも背景を反映し、取得後に補助レイヤーを追加する', async ({ page }) => {
	await observeStartup(page);
	let release!: () => void;
	let requested = 0;
	const gate = new Promise<void>(resolve => {
		release = resolve;
	});
	await page.route('**/morivis_satellite.json', async route => {
		requested++;
		await gate;
		await route.fulfill({ json: referenceStyle });
	});
	try {
		await openMap(page);
		await expect.poll(() => requested).toBe(1);
		await expectBackground(page);
		expect(await layerIds(page)).not.toContain('@reference_test-boundary');
	} finally {
		release();
	}
	await expect.poll(() => layerIds(page)).toContain('@reference_test-boundary');
	expect(requested).toBe(1);
});

test('取得中にオフにした補助レイヤーは復活せず、再表示時は取得済みスタイルを使う', async ({ page }) => {
	await observeStartup(page);
	let release!: () => void;
	let requested = 0;
	const gate = new Promise<void>(resolve => {
		release = resolve;
	});
	await page.route('**/morivis_satellite.json', async route => {
		requested++;
		await gate;
		await route.fulfill({ json: referenceStyle });
	});
	try {
		await openMap(page);
		await expectBackground(page);
		await page.getByRole('button', { name: '背景地図・補助レイヤー' }).click();
		await toggleRoads(page);
		await expect(page.locator('input[id="道路・線路・境界"]')).not.toBeChecked();
	} finally {
		release();
	}
	// 地名レイヤーが届いたことで、応答後のスタイル反映まで完了したと判定する。
	await expect.poll(() => layerIds(page)).toContain('@reference_label-test-place');
	await expect(page.locator('input[id="地名・POI"]')).toBeChecked();
	await expectBackground(page);
	expect(await layerIds(page)).not.toContain('@reference_test-boundary');
	await toggleRoads(page);
	await expect.poll(() => layerIds(page)).toContain('@reference_test-boundary');
	expect(requested).toBe(1);
});

test('補助スタイル取得失敗でも背景を表示し、切り替え後に再取得できる', async ({ page }) => {
	await observeStartup(page);
	let requested = 0;
	await page.route('**/morivis_satellite.json', async route => {
		requested++;
		if (requested === 1) await route.fulfill({ status: 503, body: 'test-unavailable' });
		else await route.fulfill({ json: referenceStyle });
	});
	await openMap(page);
	await expect(page.getByText('線・地名・POIのスタイルを取得できませんでした', { exact: true }))
		.toBeVisible();
	await expectBackground(page);
	await page.getByRole('button', { name: '背景地図・補助レイヤー' }).click();
	await toggleRoads(page);
	await toggleRoads(page);
	await expect.poll(() => layerIds(page)).toContain('@reference_test-boundary');
	expect(requested).toBe(2);
});

test('アイコンWorkerの準備完了前でも地図を初期化し背景を反映する', async ({ page }) => {
	await observeStartup(page, true);
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await openMap(page);
	await expect.poll(() =>
		page.evaluate(() => (window as typeof window & StartupState).testWarmups)
	).toBe(1);
	await expectBackground(page);
	await page.evaluate(() => (window as typeof window & StartupState).testReleaseWarmup());
	await expect.poll(() =>
		page.evaluate(() => (window as typeof window & StartupState).testWarmupCompletions)
	).toBe(1);
	await expect.poll(() => layerIds(page)).toContain('@reference_test-boundary');
	expect(errors).toEqual([]);
});

test('アイコンWorkerの準備失敗を処理し、地図を利用できる', async ({ page }) => {
	await observeStartup(page, true);
	const errors: string[] = [];
	const logs: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	page.on('console', message => logs.push(message.text()));
	await openMap(page);
	await expectBackground(page);
	await page.evaluate(() => (window as typeof window & StartupState).testReleaseWarmup(true));
	await expect.poll(() =>
		logs.some(log => log.includes('Failed to warm up generated POI icon worker:'))
	).toBe(true);
	await page.locator('canvas.maplibregl-canvas:visible').first().click();
	await expectBackground(page);
	expect(errors).toEqual([]);
});
