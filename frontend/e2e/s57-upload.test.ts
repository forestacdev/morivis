import { readFileSync } from 'node:fs';
import { expect, type Page, test } from './map-test';

const dropFixture = async (page: Page, name: string | string[], invalid = false) => {
	const files = (Array.isArray(name) ? name : [name]).map(name => ({
		name,
		bytes: [
			...readFileSync(
				new URL(`../src/routes/map/utils/formats/s57/__fixtures__/${name}`, import.meta.url)
			)
		]
	}));
	const surface = page.locator('canvas.maplibregl-canvas:visible').first();
	// 解析が終わっても短時間残るProcessingの退場アニメーションを待つ。
	await expect.poll(() =>
		surface.evaluate(canvas => {
			const bounds = canvas.getBoundingClientRect();
			return !!document.elementFromPoint(
				bounds.left + bounds.width / 2,
				bounds.top + bounds.height / 2
			)?.closest('[role="region"]');
		})
	).toBe(true);
	await surface.evaluate((canvas, input) => {
		const transfer = new DataTransfer();
		for (const file of input.files) {
			transfer.items.add(
				new File(
					[input.invalid ? 'test-invalid-s57' : new Uint8Array(file.bytes)],
					file.name
				)
			);
		}
		const bounds = canvas.getBoundingClientRect();
		const target = document.elementFromPoint(
			bounds.left + bounds.width / 2,
			bounds.top + bounds.height / 2
		) ?? canvas;
		target.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true }));
	}, { files, invalid });
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
	await page.goto('map?c=2.500000_1.250000&z=14&p=0&b=0', { waitUntil: 'domcontentloaded' });
	await page.locator('canvas.maplibregl-canvas:visible').first().waitFor();
});

test('S-57を地図へ追加したあと、2回目のドロップも自動解析する', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await dropFixture(page, 'test-chart.000');
	await expect(page.getByText('S-57 電子海図', { exact: true })).toBeVisible();
	await expect(page.getByLabel('S-57ファイル', { exact: true })).toBeHidden();
	await expect(page.getByText('選択済み: 1ファイル', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'ファイルを選び直す', exact: true }))
		.toBeVisible();
	await expect(page.getByText('5 地物', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: '解析', exact: true })).toHaveCount(0);
	await page.getByLabel('地物分類').selectOption('42');
	await expect(page.getByText('選択中: 1 地物', { exact: true })).toBeVisible();
	await expect(page.getByLabel('図形の種類')).toHaveValue('Polygon');
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-chart', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('S-57 電子海図', { exact: true })).toHaveCount(0);
	await dropFixture(page, 'test-other.000');
	await expect(page.getByText('5 地物', { exact: true })).toBeVisible();
	await expect(page.getByLabel('データ名')).toHaveValue('test-other');
	await page.getByLabel('地物分類').selectOption('129');
	await expect(page.getByLabel('図形の種類')).toHaveValue('Point');
	await expect(page.getByText('選択中: 2 地物', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-other', { exact: true }).first()).toBeVisible();
	expect(errors).toEqual([]);
});

test('不正なS-57と基本セルのない更新で理由を表示し、再選択で復帰する', async ({ page }) => {
	await dropFixture(page, 'test-chart.000', true);
	await expect(page.getByRole('alert')).toContainText('ISO 8211');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeDisabled();
	const chooserPromise = page.waitForEvent('filechooser');
	await page.getByRole('button', { name: 'ファイルを選び直す', exact: true }).click();
	const chooser = await chooserPromise;
	await chooser.setFiles([
		{
			name: 'test-chart.001',
			mimeType: 'application/octet-stream',
			buffer: readFileSync(
				new URL(
					'../src/routes/map/utils/formats/s57/__fixtures__/test-chart.001',
					import.meta.url
				)
			)
		}
	]);
	await expect(page.getByRole('alert')).toContainText('更新ファイル');
	await expect(page.getByText('選択済み: 1ファイル', { exact: true })).toBeVisible();
	await expect(page.getByLabel('S-57ファイル', { exact: true })).toHaveValue('');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeDisabled();
	await dropFixture(page, 'test-chart.000');
	await expect(page.getByText('5 地物', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	await dropFixture(page, 'test-other.000');
	await expect(page.getByLabel('データ名')).toHaveValue('test-other');
});

test('解析中のファイル切替・キャンセルと、新しい一式の先頭選択を扱う', async ({ page }) => {
	await page.evaluate(() => {
		const OriginalWorker = window.Worker;
		window.Worker = class extends OriginalWorker {
			private timer: ReturnType<typeof setTimeout> | undefined;
			postMessage: Worker['postMessage'] = message => {
				this.timer = setTimeout(() => super.postMessage(message), 500);
			};
			terminate = () => {
				clearTimeout(this.timer);
				super.terminate();
			};
		};
	});
	await dropFixture(page, ['test-chart.000', 'test-other.000']);
	await expect(page.getByRole('status')).toContainText('S-57を処理しています');
	await page.getByLabel('読み込むファイル').selectOption('1');
	await expect(page.getByLabel('データ名')).toHaveValue('test-other');
	await dropFixture(page, ['test-chart.000', 'test-other.000']);
	await expect(page.getByLabel('読み込むファイル')).toHaveValue('0');
	await expect(page.getByLabel('データ名')).toHaveValue('test-chart');
	await page.getByLabel('読み込むファイル').selectOption('1');
	await expect(page.getByRole('status')).toBeVisible();
	await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	await dropFixture(page, 'test-chart.000');
	await expect(page.getByLabel('データ名')).toHaveValue('test-chart');
});

test('基本セルへ連続した差分を適用し、地図追加後も更新一式を再ドロップできる', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await dropFixture(page, ['test-chart.001', 'test-chart.000']);
	await expect(page.getByText('選択済み: 2ファイル', { exact: true })).toBeVisible();
	await expect(page.getByText('更新ファイル: 1件', { exact: true })).toBeVisible();
	await expect(page.getByText('更新番号: 1', { exact: true })).toBeVisible();
	await expect(page.getByText('5 地物', { exact: true })).toBeVisible();
	await page.getByLabel('地物分類').selectOption('75');
	await expect(page.getByText('選択中: 2 地物', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('S-57 電子海図', { exact: true })).toHaveCount(0);
	await dropFixture(page, ['test-chart.002', 'test-chart.000', 'test-chart.001']);
	await expect(page.getByText('更新番号: 2', { exact: true })).toBeVisible();
	await expect(page.getByText('4 地物', { exact: true })).toBeVisible();
	expect(errors).toEqual([]);
});

test('更新番号の欠落で登録を止め、基本セルだけの再選択で更新番号を戻す', async ({ page }) => {
	await dropFixture(page, ['test-chart.000', 'test-chart.002']);
	await expect(page.getByRole('alert')).toContainText('.001が必要');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeDisabled();
	await dropFixture(page, ['test-chart.000', 'test-chart.001']);
	await expect(page.getByText('更新番号: 1', { exact: true })).toBeVisible();
	await dropFixture(page, 'test-chart.000');
	await expect(page.getByText('更新番号: 0', { exact: true })).toBeVisible();
});
