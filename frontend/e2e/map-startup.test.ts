import { geojson } from 'flatgeobuf';
import { expect, type Page, test } from './map-test';

// 起動経路だけを検証する架空の地点。写真の通信は失敗させ、実配信には接続しない。
const nodes = Buffer.from(geojson.serialize({
	type: 'FeatureCollection',
	features: [{
		type: 'Feature',
		geometry: { type: 'Point', coordinates: [0, 0] },
		properties: {
			node_id: 9001,
			has_link: false,
			photo_id: 'test-panorama',
			name: 'test-point',
			Date: '2000-01-01'
		}
	}]
}));
const links = Buffer.from(geojson.serialize({
	type: 'FeatureCollection',
	features: [{
		type: 'Feature',
		geometry: { type: 'LineString', coordinates: [[0, 0], [0.001, 0]] },
		properties: { name: 'test-link' }
	}]
}));

const mockStreetView = async (
	page: Page,
	options: { gate?: Promise<void>; failFirst?: boolean; } = {}
) => {
	const requests: string[] = [];
	let failed = false;
	await page.route('**/street_view/*', async route => {
		const name = new URL(route.request().url()).pathname.split('/').pop()!;
		requests.push(name);
		await options.gate;
		if (options.failFirst && !failed && name === 'nodes.fgb') {
			failed = true;
			await route.fulfill({ status: 503, body: 'test-unavailable' });
		} else if (name === 'node_connections.json') {
			await route.fulfill({ json: { '9001': [] } });
		} else {
			await route.fulfill({
				contentType: 'application/octet-stream',
				body: name === 'nodes.fgb' ? nodes : links
			});
		}
	});
	await page.route('**/panorama/test-panorama.webp', route => route.abort());
	return requests;
};

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

test('通常起動ではデータとパノラマを作らず、表示時に一度だけデータを取得する', async ({ page }) => {
	const requests = await mockStreetView(page);
	await page.goto('./map?c=0_0&z=1&p=0&b=0', { waitUntil: 'domcontentloaded' });
	await expect(page.locator('canvas.maplibregl-canvas:visible').first()).toBeVisible();
	const toggle = page.getByRole('button', { name: 'ストリートビュー', exact: true });
	await expect(toggle).toBeVisible();
	expect(requests).toEqual([]);
	await expect(page.getByLabel('ストリートビューのパノラマ')).toHaveCount(0);
	await toggle.click();
	await expect.poll(() => requests.length).toBe(3);
	await expect(toggle).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByLabel('ストリートビューのパノラマ')).toHaveCount(0);
	await toggle.click();
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-pressed', 'true');
	expect(requests).toHaveLength(3);
});

test('初回オンの後で届いた地点と経路が、切り替え直さず地図ソースへ反映される', async ({ page }) => {
	// 通信件数だけでなく、MapLibreが描画Workerへ渡す実際のGeoJSONを確認する。
	const sourceSizes: Record<string, number> = {};
	await page.exposeFunction('recordStreetViewSource', (source: string, size: number) => {
		sourceSizes[source] = size;
	});
	await page.addInitScript(() => {
		const recorder = window as typeof window & {
			recordStreetViewSource: (source: string, size: number) => Promise<void>;
		};
		Worker.prototype.postMessage = new Proxy(Worker.prototype.postMessage, {
			apply: (target, worker, args) => {
				const data = args[0]?.data;
				if (
					data?.source?.startsWith('street_view_')
					&& Array.isArray(data.data?.features)
				) void recorder.recordStreetViewSource(data.source, data.data.features.length);
				return Reflect.apply(target, worker, args);
			}
		});
	});
	let release!: () => void;
	const gate = new Promise<void>(resolve => {
		release = resolve;
	});
	const requests = await mockStreetView(page, { gate });
	await page.goto('./map?c=0_0&z=1&p=0&b=0', { waitUntil: 'domcontentloaded' });
	const toggle = page.getByRole('button', { name: 'ストリートビュー', exact: true });
	try {
		await toggle.click();
		await expect.poll(() => requests.length).toBe(3);
		await expect.poll(() => sourceSizes).toEqual({
			street_view_node_sources: 0,
			street_view_link_sources: 0
		});
		await expect.poll(() =>
			page.evaluate(() =>
				(window as typeof window & { __morivis_map_idle?: boolean; }).__morivis_map_idle
			)
		).toBe(true);
	} finally {
		release();
	}
	await expect.poll(() => sourceSizes).toEqual({
		street_view_node_sources: 1,
		street_view_link_sources: 1
	});
	await expect(toggle).toHaveAttribute('aria-pressed', 'true');
	expect(requests).toHaveLength(3);
});

test('URLから直接開いてもデータ待ちで地図を止めず、終了時にパノラマを破棄する', async ({ page }) => {
	let release!: () => void;
	const gate = new Promise<void>(resolve => {
		release = resolve;
	});
	const requests = await mockStreetView(page, { gate });
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	try {
		await page.goto('./map?c=0_0&z=1&p=0&b=0&sv=9001', { waitUntil: 'domcontentloaded' });
		await expect.poll(() => requests.length).toBe(3);
		await expect(page.locator('canvas.maplibregl-canvas:visible').first()).toBeVisible();
		await expect(page.getByLabel('ストリートビューのパノラマ')).toHaveCount(0);
	} finally {
		release();
	}
	await expect(page.getByLabel('ストリートビューのパノラマ')).toBeVisible({ timeout: 20000 });
	await page.getByRole('button', { name: 'ストリートビューを閉じる' }).click();
	await expect(page.getByLabel('ストリートビューのパノラマ')).toHaveCount(0);
	await expect(page.locator('canvas.maplibregl-canvas:visible').first()).toBeVisible();
	expect(errors).toEqual([]);
});

test('データ取得失敗後も地図を使え、表示切替で再試行できる', async ({ page }) => {
	const requests = await mockStreetView(page, { failFirst: true });
	await page.goto('./map?c=0_0&z=1&p=0&b=0', { waitUntil: 'domcontentloaded' });
	const toggle = page.getByRole('button', { name: 'ストリートビュー', exact: true });
	await toggle.click();
	await expect(page.getByText('ストリートビューデータを取得できませんでした。', { exact: false }))
		.toBeVisible();
	await expect(page.locator('canvas.maplibregl-canvas:visible').first()).toBeVisible();
	await toggle.click();
	await toggle.click();
	await expect.poll(() => requests.length).toBe(6);
	await expect(page.getByLabel('ストリートビューのパノラマ')).toHaveCount(0);
});
