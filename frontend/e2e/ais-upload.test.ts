import { readFileSync } from 'node:fs';
import { expect, type Page, test } from './map-test';

const dropFixture = async (page: Page, name: string | string[], invalid = false) => {
	const files = (Array.isArray(name) ? name : [name]).map(name => ({
		name,
		bytes: [
			...readFileSync(
				new URL(
					`../src/routes/map/utils/formats/ais/__fixtures__/${name}`,
					import.meta.url
				)
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
					[input.invalid ? 'test-invalid-ais' : new Uint8Array(file.bytes)],
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

test('軌跡を登録した後の2回目のドロップで計測点も登録できる', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await dropFixture(page, 'test-vessels.ais');
	await expect(page.getByLabel('AISファイル', { exact: true })).toBeHidden();
	await expect(page.getByText('選択済み: 1ファイル', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'ライン', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'ポイント', exact: true })).toBeVisible();
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-vessels', { exact: true }).first()).toBeVisible();
	await dropFixture(page, 'test-vessels.ais');
	await page.getByRole('button', { name: 'ポイント', exact: true }).click();
	await page.getByLabel('データ名').fill('test-points');
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-points', { exact: true }).first()).toBeVisible();
	expect(errors).toEqual([]);
});

test('不正な入力を選び直し、同じファイルを再選択できる', async ({ page }) => {
	await dropFixture(page, 'test-vessels.ais', true);
	await expect(page.getByRole('alert')).toContainText('AISログが見つかりません');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeDisabled();
	const input = page.getByLabel('AISファイル', { exact: true });
	const file = {
		name: 'test-vessels.log',
		mimeType: 'text/plain',
		buffer: readFileSync(
			new URL(
				'../src/routes/map/utils/formats/ais/__fixtures__/test-vessels.ais',
				import.meta.url
			)
		)
	};
	await input.setInputFiles(file);
	await expect(page.getByRole('button', { name: 'ライン', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'ポイント', exact: true })).toBeVisible();
	await page.getByLabel('データ名').fill('test-edited');
	await input.setInputFiles(file);
	await expect(page.getByLabel('データ名')).toHaveValue('test-vessels');
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toBeVisible();
});

test('複数ログは結合せず選択したファイルのみ表示する', async ({ page }) => {
	await dropFixture(page, ['test-vessels.ais', 'test-untimed.ais']);
	await expect(page.getByLabel('読み込むファイル')).toBeVisible();
	await page.getByLabel('読み込むファイル').selectOption('1');
	await expect(page.getByText('日時のない位置報告: 2件。記録順で扱い、時刻は推定しません。'))
		.toBeVisible();
	await expect(page.getByRole('button', { name: 'ライン', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	await dropFixture(page, 'test-vessels.ais');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeEnabled();
});
