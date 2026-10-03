import { readFileSync } from 'node:fs';
import { expect, type Page, test } from './map-test';

const dropFixture = async (page: Page, name: string | string[], invalid = false) => {
	const files = (Array.isArray(name) ? name : [name]).map(name => ({
		name,
		bytes: [
			...readFileSync(
				new URL(
					`../src/routes/map/utils/formats/czml/__fixtures__/${name}`,
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
					[input.invalid ? 'test-invalid-czml' : new Uint8Array(file.bytes)],
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

test('時刻付きポイントを追加し、2回目のドロップで軌跡を登録できる', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await dropFixture(page, 'test-moving.czml');
	await expect(page.getByLabel('CZMLファイル', { exact: true })).toBeHidden();
	await expect(page.getByText('時刻: 3件', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-moving', { exact: true }).first()).toBeVisible();
	await dropFixture(page, 'test-moving.czml');
	await page.getByRole('button', { name: '軌跡', exact: true }).click();
	await page.getByLabel('データ名').fill('test-tracks');
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-tracks', { exact: true }).first()).toBeVisible();
	expect(errors).toEqual([]);
});

test('静的なラインとポリゴンを登録できる', async ({ page }) => {
	for (const type of ['ライン', 'ポリゴン']) {
		await dropFixture(page, 'test-static.czml');
		await page.getByRole('button', { name: type, exact: true }).click();
		await page.getByLabel('データ名').fill(`test-${type}`);
		await page.getByRole('button', { name: '登録', exact: true }).click();
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await expect(page.getByText(`test-${type}`, { exact: true }).first()).toBeVisible();
	}
});

test('不正なファイルからJSONの再選択で復帰し、同じファイルも再選択できる', async ({ page }) => {
	await dropFixture(page, 'test-moving.czml', true);
	await expect(page.getByRole('alert')).toContainText('JSONを読み取れませんでした');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeDisabled();
	const file = {
		name: 'test-static.json',
		mimeType: 'application/json',
		buffer: readFileSync(
			new URL(
				'../src/routes/map/utils/formats/czml/__fixtures__/test-static.czml',
				import.meta.url
			)
		)
	};
	const input = page.getByLabel('CZMLファイル', { exact: true });
	await input.setInputFiles(file);
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeEnabled();
	await page.getByLabel('データ名').fill('test-edited');
	await input.setInputFiles(file);
	await expect(page.getByLabel('データ名')).toHaveValue('test-static');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeEnabled();
});

test('複数ファイルを切り替えてキャンセル後もドロップできる', async ({ page }) => {
	await dropFixture(page, ['test-moving.czml', 'test-static.czml']);
	await expect(page.getByText('時刻: 3件', { exact: true })).toBeVisible();
	await page.getByLabel('読み込むファイル').selectOption('1');
	await expect(page.getByText('時刻: 0件', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'ポリゴン', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	await dropFixture(page, 'test-moving.czml');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeEnabled();
});
