import { readFileSync } from 'node:fs';
import { expect, type Page, test } from './map-test';

const fixture = (name: string) =>
	readFileSync(
		new URL(`../src/routes/map/utils/formats/csw/__fixtures__/${name}`, import.meta.url),
		'utf8'
	);
const openUpload = async (page: Page) => {
	await page.getByRole('button', { name: 'データ一覧を見る', exact: true }).click();
	await page.getByRole('button', { name: 'アップロード', exact: true }).click();
};
const mockCatalog = async (page: Page) => {
	const searches: URL[] = [];
	await page.route('https://test.invalid/csw?**', async route => {
		const url = new URL(route.request().url());
		const request = url.searchParams.get('request');
		let name = 'test-capabilities.xml';
		if (request === 'GetRecords') {
			searches.push(url);
			name = url.searchParams.get('startPosition') === '3'
				? 'test-records-last.xml'
				: 'test-records.xml';
		} else if (request === 'GetRecordById') {
			if (url.searchParams.get('id') !== 'test-record-1') {
				await route.fulfill({ status: 503, body: 'test-unavailable' });
				return;
			}
			name = 'test-detail.xml';
		}
		await route.fulfill({ contentType: 'application/xml', body: fixture(name) });
	});
	return searches;
};

test.beforeEach(async ({ page }) => {
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
		} else await route.fulfill({ json: {} });
	});
	await page.goto('map?c=2.500000_1.250000&z=4&p=0&b=0', { waitUntil: 'domcontentloaded' });
	await page.locator('canvas.maplibregl-canvas:visible').first().waitFor();
});

test('形式一覧から接続し、キーワード・範囲検索とページ送り、詳細を表示する', async ({ page }) => {
	const searches = await mockCatalog(page);
	await openUpload(page);
	await page.getByRole('button', { name: '対応形式一覧', exact: true }).click();
	await page.getByRole('button', { name: /^CSW カタログ/ }).click();
	await page.getByLabel('CSW URL', { exact: true }).fill('https://test.invalid/csw');
	await page.getByRole('button', { name: '接続', exact: true }).click();
	await expect(page.getByText('test-roads-detail', { exact: true })).toBeVisible();
	await page.getByLabel('キーワード', { exact: true }).fill('test-filter');
	await page.getByLabel('現在の地図範囲で検索').check();
	await page.getByRole('button', { name: '検索', exact: true }).click();
	await expect.poll(() => searches.length).toBe(2);
	expect(searches[1].searchParams.get('constraint')).toContain('test-filter');
	expect(searches[1].searchParams.get('constraint')).toContain('BBOX');
	await page.getByRole('button', { name: '次へ', exact: true }).click();
	await expect(page.getByRole('combobox', { name: '検索結果', exact: true })).toHaveValue(
		'test-record-3'
	);
	await expect(page.getByRole('button', { name: '次へ', exact: true })).toBeDisabled();
	await expect(page.getByRole('alert')).toContainText('詳細の取得に失敗');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeEnabled();
	await page.getByRole('button', { name: '前へ', exact: true }).click();
	await page.getByRole('combobox', { name: '検索結果', exact: true }).selectOption(
		'test-record-2'
	);
	await expect(page.getByText('地図に追加できる配信リンクはありません。')).toBeVisible();
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeDisabled();
});

test('CSW URLから配信ファイルを既存フォームに渡して地図へ追加できる', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await mockCatalog(page);
	await page.route('https://test.invalid/test-points.geojson**', async route => {
		await route.fulfill({
			json: {
				type: 'FeatureCollection',
				features: [{
					type: 'Feature',
					properties: { name: 'test-point' },
					geometry: { type: 'Point', coordinates: [2, 1] }
				}]
			}
		});
	});
	await openUpload(page);
	await page.getByPlaceholder('URLから読み込む').fill('https://test.invalid/csw');
	await page.getByRole('button', { name: 'URLを開く', exact: true }).click();
	await expect(page.getByText('test-roads-detail', { exact: true })).toBeVisible();
	await page.getByRole('combobox', { name: '配信リンク', exact: true }).selectOption({
		label: '[FILE] test-points'
	});
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-points', { exact: true }).first()).toBeVisible();
	expect(errors).toEqual([]);
});

test('検索結果のWMS配信リンクを既存のレイヤー選択フォームへ渡す', async ({ page }) => {
	await mockCatalog(page);
	await page.route('https://test.invalid/wms?**', async route => {
		await route.fulfill({
			contentType: 'application/xml',
			body:
				`<WMS_Capabilities xmlns="http://www.opengis.net/wms" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.3.0">
<Service><Name>WMS</Name><Title>test-map-service</Title></Service>
<Capability><Request><GetMap><Format>image/png</Format><DCPType><HTTP><Get><OnlineResource xlink:href="https://test.invalid/wms"/></Get></HTTP></DCPType></GetMap></Request>
<Layer><Title>test-root</Title><CRS>EPSG:3857</CRS><Layer><Name>test-roads</Name><Title>test-roads-layer</Title></Layer></Layer></Capability>
</WMS_Capabilities>`
		});
	});
	await openUpload(page);
	await page.getByPlaceholder('URLから読み込む').fill('https://test.invalid/csw');
	await page.getByRole('button', { name: 'URLを開く', exact: true }).click();
	await expect(page.getByText('test-roads-detail', { exact: true })).toBeVisible();
	await page.getByRole('combobox', { name: '配信リンク', exact: true }).selectOption({
		label: '[WMS] test-map'
	});
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await expect(page.getByText('WMS/WMTSの登録', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'test-roads-layer', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: '決定', exact: true })).toBeEnabled();
});
