import { readFileSync } from 'node:fs';
import { expect, type Page, test } from './map-test';

const fixture = (name: string) =>
	readFileSync(
		new URL(`../src/routes/map/utils/formats/orbit/__fixtures__/${name}`, import.meta.url)
	);
const drop = async (page: Page, names: string[]) => {
	const files = names.map(name => ({ name, bytes: [...fixture(name)] }));
	const canvas = page.locator('canvas.maplibregl-canvas:visible').first();
	await expect.poll(() =>
		canvas.evaluate(element => {
			const b = element.getBoundingClientRect();
			return !!document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)?.closest(
				'[role="region"]'
			);
		})
	).toBe(true);
	await canvas.evaluate((element, files) => {
		const transfer = new DataTransfer();
		for (const file of files) {
			transfer.items.add(new File([new Uint8Array(file.bytes)], file.name));
		}
		const b = element.getBoundingClientRect();
		const target = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
			?? element;
		target.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true }));
	}, files);
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
		} else await route.fulfill({ contentType: 'application/json', body: '{}' });
	});
	await page.goto('map?c=2.500000_1.250000&z=3&p=0&b=0', { waitUntil: 'domcontentloaded' });
	await page.locator('canvas.maplibregl-canvas:visible').first().waitFor();
});

test('TLEのポイントを計算し、2回目のドロップでOMMの地上軌跡を登録する', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await drop(page, ['test-orbit.tle']);
	await expect(page.getByText('衛星: 1基', { exact: true })).toBeVisible();
	await expect(page.getByText('計算点数: 121点 / 上限: 200,000点', { exact: true }))
		.toBeVisible();
	await page.getByLabel('終了時刻（UTC）').fill('2024-01-02T00:10');
	await page.getByLabel('計算間隔（秒）').fill('120');
	await expect(page.getByText('計算点数: 6点 / 上限: 200,000点', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'ポイント', exact: true }).click();
	await page.getByLabel('データ名').fill('test-orbit-points');
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-orbit-points', { exact: true }).first()).toBeVisible();
	await drop(page, ['test-orbit.json']);
	await expect(page.getByText('衛星: 1基', { exact: true })).toBeVisible();
	await page.getByLabel('データ名').fill('test-orbit-tracks');
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-orbit-tracks', { exact: true }).first()).toBeVisible();
	expect(errors).toEqual([]);
});

test('期間と刻み幅を検証し、修正後は登録できる', async ({ page }) => {
	await drop(page, ['test-orbit.tle']);
	await page.getByLabel('終了時刻（UTC）').fill('2024-01-01T00:00');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeDisabled();
	await page.getByLabel('終了時刻（UTC）').fill('2024-01-05T00:00');
	await page.getByLabel('計算間隔（秒）').fill('1');
	await expect(page.getByRole('alert')).toContainText('上限');
	await page.getByLabel('計算間隔（秒）').fill('0.5');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeDisabled();
	await page.getByLabel('計算間隔（秒）').fill('60');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeEnabled();
});

test('複数ファイルの切替とキャンセル後の再ドロップに対応する', async ({ page }) => {
	await drop(page, ['test-orbit.tle', 'test-orbits.json']);
	await page.getByLabel('読み込むファイル').selectOption('1');
	await expect(page.getByText('衛星: 2基', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	await drop(page, ['test-orbit.tle']);
	await expect(page.getByText('衛星: 1基', { exact: true })).toBeVisible();
	await page.getByLabel('TLE / OMMファイル', { exact: true }).setInputFiles({
		name: 'test-invalid.tle',
		mimeType: 'text/plain',
		buffer: Buffer.from('test-invalid')
	});
	await expect(page.getByRole('alert')).toBeVisible();
	await page.getByLabel('TLE / OMMファイル', { exact: true }).setInputFiles({
		name: 'test-orbit.tle',
		mimeType: 'text/plain',
		buffer: fixture('test-orbit.tle')
	});
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeEnabled();
});

test('テキストを検証して期間を設定し、OMMを登録できる', async ({ page }) => {
	await drop(page, ['test-orbit.tle']);
	await page.getByRole('button', { name: 'テキスト', exact: true }).click();
	await page.getByLabel('TLE / OMMテキスト', { exact: true }).fill('test-invalid');
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await expect(page.getByRole('alert')).toBeVisible();
	await page.getByLabel('TLE / OMMテキスト', { exact: true }).fill(
		fixture('test-orbit.json').toString()
	);
	await page.getByLabel('データ名').fill('test-pasted-orbit');
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await expect(page.getByText('衛星: 1基', { exact: true })).toBeVisible();
	await page.getByLabel('終了時刻（UTC）').fill('2024-01-02T00:10');
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-pasted-orbit', { exact: true }).first()).toBeVisible();
});
