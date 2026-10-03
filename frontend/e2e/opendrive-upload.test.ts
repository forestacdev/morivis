import { readFileSync } from 'node:fs';
import { expect, type Page, test } from './map-test';

const dropFixture = async (page: Page, name: string | string[], invalid = false) => {
	const files = (Array.isArray(name) ? name : [name]).map(name => ({
		name,
		bytes: [
			...readFileSync(
				new URL(
					`../src/routes/map/utils/formats/opendrive/__fixtures__/${name}`,
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
					[input.invalid ? 'test-invalid-opendrive' : new Uint8Array(file.bytes)],
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

test('車線を地図に追加し、2回目のドロップで道路基準線も登録できる', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await dropFixture(page, 'test-road.xodr');
	await expect(page.getByLabel('OpenDRIVEファイル', { exact: true })).toBeHidden();
	await expect(page.getByText('選択済み: 1ファイル', { exact: true })).toBeVisible();
	await expect(page.getByLabel('データ名')).toHaveValue('test-road');
	await expect(page.getByLabel('表示対象')).toHaveValue('lane');
	await expect(page.getByText('選択中: 5地物', { exact: true })).toBeVisible();
	await page.getByLabel('車線の種類').selectOption('sidewalk');
	await expect(page.getByText('選択中: 1地物', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-road', { exact: true }).first()).toBeVisible();
	await dropFixture(page, 'test-road.xodr');
	await page.getByLabel('表示対象').selectOption('reference-line');
	await expect(page.getByText('選択中: 1地物', { exact: true })).toBeVisible();
	await page.getByLabel('データ名').fill('test-reference');
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-reference', { exact: true }).first()).toBeVisible();
	expect(errors).toEqual([]);
});

test('ローカル座標は座標指定を求め、複数ファイルの選択で状態を切り替える', async ({ page }) => {
	await dropFixture(page, ['test-local.xodr', 'test-road.xodr']);
	await expect(page.getByText('選択中: 3地物', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeEnabled();
	await expect(page.getByRole('button', { name: '座標系を選択', exact: true })).toHaveCount(0);
	await expect(page.getByText('座標系を特定できませんでした。', { exact: false })).toHaveCount(0);
	await expect(page.getByRole('button', { name: '位置合わせ', exact: true })).toHaveCount(0);
	await page.getByLabel('読み込むファイル').selectOption('1');
	await expect(page.getByLabel('データ名')).toHaveValue('test-road');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeEnabled();
	await page.getByLabel('読み込むファイル').selectOption('0');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeEnabled();
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await expect(page.getByText(/選択されたEPSGコード:/)).toBeVisible();
	await page.getByText('位置合わせ', { exact: true }).first().click();
	await expect(page.getByText('ファイル: test-local.png', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: '決定', exact: true }).last()).toBeVisible();
	await page.getByRole('button', { name: '決定', exact: true }).last().click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-local', { exact: true }).first()).toBeVisible();
});

test('不正なXMLから再選択で復帰し、同じファイルも再度読み込める', async ({ page }) => {
	await dropFixture(page, 'test-road.xodr', true);
	await expect(page.getByRole('alert')).toContainText('XML');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeDisabled();
	const input = page.getByLabel('OpenDRIVEファイル', { exact: true });
	const file = {
		name: 'test-road.xodr',
		mimeType: 'application/xml',
		buffer: readFileSync(
			new URL(
				'../src/routes/map/utils/formats/opendrive/__fixtures__/test-road.xodr',
				import.meta.url
			)
		)
	};
	await input.setInputFiles(file);
	await expect(page.getByText('選択中: 5地物', { exact: true })).toBeVisible();
	await page.getByLabel('表示対象').selectOption('reference-line');
	await input.setInputFiles(file);
	await expect(page.getByLabel('表示対象')).toHaveValue('lane');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeEnabled();
	await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	await dropFixture(page, 'test-road.xodr');
	await expect(page.getByText('選択中: 5地物', { exact: true })).toBeVisible();
});

test('座標系を指定してローカル道路を登録できる', async ({ page }) => {
	await dropFixture(page, 'test-local.xodr');
	await expect(page.getByText('選択中: 3地物', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await expect(page.getByText(/選択されたEPSGコード:/)).toBeVisible();
	await page.locator('label').filter({ hasText: 'Web メルカトル座標系' }).click();
	await page.getByRole('button', { name: '決定', exact: true }).last().click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-local', { exact: true }).first()).toBeVisible();
});
